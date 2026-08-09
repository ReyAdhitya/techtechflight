import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  assignSeatCraft,
  grantSeatClearance,
  grantSeatsForDrone,
  holdSeatClearance,
  holdSeatsForDrone,
  joinClassroomAsStudent,
  loadClassroomByCode,
  markSeatFlown,
  mintClassroomCode,
  normalizeClassroomCode,
  openClassroom,
  readClassroomSession,
  requestTakeoff,
  resetClassroomForTests,
  seatHasFlown,
  STUDENT_SEAT_KEY,
  type ClassroomSeat,
  type ClassroomSession,
} from './classroom-session'

beforeEach(() => {
  resetClassroomForTests()
})

afterEach(() => {
  resetClassroomForTests()
})

describe('classroom session', () => {
  it('mints a short shoutable code', () => {
    const code = mintClassroomCode(1_700_000_000_000)
    expect(code).toHaveLength(4)
    expect(normalizeClassroomCode(' ab-12 ')).toBe('AB12')
  })

  it('opens a live classroom and lets a Student join and request takeoff', () => {
    const session = openClassroom({
      lessonId: 'lesson-1',
      lessonLabel: 'Year 8',
      scenarioId: 'search-rescue',
      scenarioName: 'Search and Rescue',
      objective: 'Find the target.',
      rules: ['Stay inside the zone'],
      limitMinutes: 15,
      zones: [],
      roster: [{ studentId: 'stu-ada', name: 'Ada' }],
      live: true,
      now: 1_000,
    })

    expect(session.code).toHaveLength(4)
    expect(session.live).toBe(true)
    expect(session.roster).toEqual([{ studentId: 'stu-ada', name: 'Ada' }])

    const joined = joinClassroomAsStudent(session, 'Ada', 2_000, 'stu-ada')
    expect(joined.seat.name).toBe('Ada')
    expect(joined.seat.studentId).toBe('stu-ada')
    expect(joined.session.seats).toHaveLength(1)

    const requested = requestTakeoff(joined.session, joined.seat.studentId, 3_000)
    expect(requested.seats[0]?.phase).toBe('awaiting-clearance')

    const granted = grantSeatClearance(requested, joined.seat.studentId, 4_000)
    expect(granted.seats[0]?.phase).toBe('cleared')
    expect(granted.seats[0]?.clearedAt).toBe(4_000)
  })

  it('loads a classroom by code from localStorage before asking the cloud', async () => {
    const session = openClassroom({
      lessonId: 'lesson-1',
      lessonLabel: 'Year 8',
      scenarioId: 'search-rescue',
      scenarioName: 'Search and Rescue',
      objective: 'Find the target.',
      rules: [],
      limitMinutes: 15,
      zones: [],
      live: true,
      now: 1_000,
    })

    const found = await loadClassroomByCode(session.code)
    expect(found?.code).toBe(session.code)
    expect(found?.lessonLabel).toBe('Year 8')
  })
})

/**
 * The phase is a record of what happened, and every writer here is either the Teacher
 * answering or the Fleet reporting. There is no press anywhere that says "I have landed".
 */
describe('the phase a Student is in', () => {
  const seatedAda = () => {
    const session = openClassroom({
      lessonId: 'lesson-1',
      lessonLabel: 'Year 8',
      scenarioId: 'search-rescue',
      scenarioName: 'Search and Rescue',
      objective: 'Find the target.',
      rules: [],
      limitMinutes: 15,
      zones: [],
      live: true,
      now: 1_000,
    })
    return joinClassroomAsStudent(session, 'Ada', 2_000)
  }

  /*
   * Held used to send the seat back to `request-takeoff`, which made a Student the Teacher
   * had told to wait indistinguishable from one who had never asked. The screen then had no
   * way to say why they were waiting.
   */
  it('keeps a hold apart from never having asked', () => {
    const { session, seat } = seatedAda()
    const asked = requestTakeoff(session, seat.studentId, 3_000)

    const held = holdSeatClearance(asked, seat.studentId, 4_000)
    expect(held.seats[0]?.phase).toBe('held')
    expect(held.seats[0]?.heldAt).toBe(4_000)
    expect(held.seats[0]?.takeoffRequestedAt).toBeNull()

    // Asking again is what clears it; the Teacher is not asked to un-hold.
    const askedAgain = requestTakeoff(held, seat.studentId, 5_000)
    expect(askedAgain.seats[0]?.phase).toBe('awaiting-clearance')
    expect(askedAgain.seats[0]?.heldAt).toBeNull()
  })

  /*
   * The other half of the Teacher's Hold. Without this the answer never leaves the Teacher's
   * board and the Student sits on "Waiting for your Teacher" while the Teacher believes they
   * have been told to wait.
   */
  it('carries a hold addressed to a craft to the seat sitting in it', () => {
    const { session, seat } = seatedAda()
    const paired = assignSeatCraft(session, seat.studentId, 'ttf-0001', 'Drone 1')
    const asked = requestTakeoff(paired, seat.studentId, 3_000)

    const held = holdSeatsForDrone(asked, 'ttf-0001', 4_000)
    expect(held.seats[0]?.phase).toBe('held')
    expect(held.seats[0]?.heldAt).toBe(4_000)
  })

  /* A Student who never asked is not answered. */
  it('holds nobody who has not asked to take off', () => {
    const { session, seat } = seatedAda()
    const paired = assignSeatCraft(session, seat.studentId, 'ttf-0001', 'Drone 1')

    const held = holdSeatsForDrone(paired, 'ttf-0001', 4_000)
    expect(held.seats[0]?.phase).not.toBe('held')
    expect(held.seats[0]?.heldAt).toBeNull()
  })

  /*
   * A clearance is permission to leave the ground, not evidence of having left it. Reading
   * one as the other put a Student still standing on the pad on the landed screen.
   */
  it('does not read a clearance as having flown', () => {
    const { session, seat } = seatedAda()
    const cleared = grantSeatClearance(session, seat.studentId, 4_000)

    expect(seatHasFlown(cleared.seats[0]!)).toBe(false)
  })

  it('records the first sighting off the ground and never a later one', () => {
    const { session, seat } = seatedAda()

    const flying = markSeatFlown(session, seat.studentId, 5_000)
    expect(flying.seats[0]?.phase).toBe('flying')
    expect(flying.seats[0]?.flownAt).toBe(5_000)

    const again = markSeatFlown(flying, seat.studentId, 9_000)
    expect(again.seats[0]?.flownAt).toBe(5_000)
  })

  /*
   * A session outlives a deploy: it sits in `localStorage` and is read back by whatever
   * ships next. A seat written before `flownAt` existed has no such field, and reading the
   * absence as "has flown" would land a Student who never took off.
   */
  it('treats a seat written before flownAt existed as never having flown', () => {
    const { seat } = seatedAda()
    const { flownAt: _absent, ...older } = seat

    expect(seatHasFlown(older as ClassroomSeat)).toBe(false)
  })
})

/**
 * Why the Teacher's board threads the session through its answers.
 *
 * Every one of these writers persists what it returns, so a single answer reaches the tablet
 * on its own. Each also *starts* from the session it is handed, which is the part that is easy
 * to miss: answering two Drones from the same stale session writes a session missing the first
 * answer. `ControlScreen` threads the return value between its grant and hold loops for that
 * reason, and the thread has been read as dead code once already.
 */
describe('answering two Drones in one press', () => {
  const twoSeated = () => {
    const session = openClassroom({
      lessonId: 'lesson-1',
      lessonLabel: 'Year 8',
      scenarioId: 'search-rescue',
      scenarioName: 'Search and Rescue',
      objective: 'Find the target.',
      rules: [],
      limitMinutes: 15,
      zones: [],
      live: true,
      now: 1_000,
    })
    const ada = joinClassroomAsStudent(session, 'Ada', 2_000, 'stu-ada')
    /*
     * Two tablets, not two names on one. A join reuses the seat this device already holds,
     * which is right on a tablet and wrong in a test that needs two children.
     */
    window.localStorage.removeItem(STUDENT_SEAT_KEY)
    const bea = joinClassroomAsStudent(ada.session, 'Bea', 2_100, 'stu-bea')
    let next = assignSeatCraft(bea.session, 'stu-ada', 'ttf-0001', 'Drone 1')
    next = assignSeatCraft(next, 'stu-bea', 'ttf-0002', 'Drone 2')
    next = requestTakeoff(next, 'stu-ada', 3_000)
    next = requestTakeoff(next, 'stu-bea', 3_100)
    return next
  }

  const phaseOf = (session: ClassroomSession, studentId: string) =>
    session.seats.find((seat) => seat.studentId === studentId)?.phase

  it('keeps both answers when the session is threaded', () => {
    const asked = twoSeated()

    let answered = grantSeatsForDrone(asked, 'ttf-0001', 4_000)
    answered = holdSeatsForDrone(answered, 'ttf-0002', 4_100)

    expect(phaseOf(answered, 'stu-ada')).toBe('cleared')
    expect(phaseOf(answered, 'stu-bea')).toBe('held')
    // And the same on the record the tablets actually read.
    expect(phaseOf(readClassroomSession()!, 'stu-ada')).toBe('cleared')
    expect(phaseOf(readClassroomSession()!, 'stu-bea')).toBe('held')
  })

  /* The failure the thread exists to prevent, pinned so nobody unpicks it again. */
  it('loses the first answer when the same stale session is passed twice', () => {
    const asked = twoSeated()

    grantSeatsForDrone(asked, 'ttf-0001', 4_000)
    holdSeatsForDrone(asked, 'ttf-0002', 4_100)

    expect(phaseOf(readClassroomSession()!, 'stu-bea')).toBe('held')
    expect(phaseOf(readClassroomSession()!, 'stu-ada')).not.toBe('cleared')
  })
})
