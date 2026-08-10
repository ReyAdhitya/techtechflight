import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  assignSeatCraft,
  canTakeDrone,
  droneGrid,
  droneNumber,
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
  freeDroneSeat,
  seatHasFlown,
  seatStudentByHand,
  STUDENT_SEAT_KEY,
  takeDroneSeat,
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

/**
 * How a Student gets on a Drone: they tap the number painted on the one in their hands.
 *
 * The greying out on the tablet is a courtesy. These pin the refusal underneath it, because
 * two children reaching for Drone 3 tap in the same second and the screen they are looking at
 * was rendered before either of them moved.
 */
describe('taking the Drone in your hands', () => {
  const withThree = () =>
    openClassroom({
      lessonId: 'lesson-1',
      lessonLabel: 'Year 6',
      scenarioId: null,
      scenarioName: '',
      objective: '',
      rules: [],
      limitMinutes: 20,
      zones: [],
      drones: [
        { droneId: 'ttf-0003', droneName: 'Drone 3', number: 3 },
        { droneId: 'ttf-0001', droneName: 'Drone 1', number: 1 },
      ],
    })

  it('reads the number off the name, then off the id', () => {
    expect(droneNumber('Drone 12', 'ttf-0012')).toBe(12)
    expect(droneNumber('Kestrel', 'ttf-0004')).toBe(4)
    // Neither carries one. Zero sorts it to the front rather than dropping it off the grid.
    expect(droneNumber('Kestrel', 'kestrel')).toBe(0)
  })

  it('offers the grid by number, not by id', () => {
    const session = withThree()
    expect(droneGrid(session).map((row) => row.number)).toEqual([1, 3])
    expect(droneGrid(session).every((row) => row.takenBy === null)).toBe(true)
  })

  it('seats a Student on the Drone they tapped', () => {
    const session = joinClassroomAsStudent(withThree(), 'Amira', 1_000, 'stu-amira').session
    const next = takeDroneSeat(session, 'stu-amira', 'ttf-0003')

    expect(next.seats[0]?.droneName).toBe('Drone 3')
    expect(droneGrid(next).find((row) => row.number === 3)?.takenBy).toBe('Amira')
  })

  it('refuses a Drone somebody else already has', () => {
    const first = joinClassroomAsStudent(withThree(), 'Amira', 1_000, 'stu-amira').session
    window.localStorage.removeItem(STUDENT_SEAT_KEY)
    const second = joinClassroomAsStudent(first, 'Ben', 1_100, 'stu-ben').session

    const held = takeDroneSeat(second, 'stu-amira', 'ttf-0003')
    const refused = takeDroneSeat(held, 'stu-ben', 'ttf-0003')

    expect(refused.seats.find((seat) => seat.studentId === 'stu-ben')?.droneId).toBeNull()
    expect(refused.seats.find((seat) => seat.studentId === 'stu-amira')?.droneId).toBe('ttf-0003')
  })

  it('lets a Student change their mind, because a child has one pair of hands', () => {
    const session = joinClassroomAsStudent(withThree(), 'Amira', 1_000, 'stu-amira').session
    const three = takeDroneSeat(session, 'stu-amira', 'ttf-0003')
    const one = takeDroneSeat(three, 'stu-amira', 'ttf-0001')

    expect(one.seats[0]?.droneName).toBe('Drone 1')
    expect(droneGrid(one).find((row) => row.number === 3)?.takenBy).toBeNull()
  })

  it('ignores a Drone that is not in this Lesson', () => {
    const session = joinClassroomAsStudent(withThree(), 'Amira', 1_000, 'stu-amira').session
    expect(takeDroneSeat(session, 'stu-amira', 'ttf-9999').seats[0]?.droneId).toBeNull()
  })
})

/**
 * The Teacher's half of the same question.
 *
 * A broken iPad must not stop a child flying, and a seat holding a craft nobody is flying is
 * what stops the next child taking it.
 */
describe('the Teacher seating and freeing by hand', () => {
  const withOne = () =>
    openClassroom({
      lessonId: 'lesson-1',
      lessonLabel: 'Year 6',
      scenarioId: null,
      scenarioName: '',
      objective: '',
      rules: [],
      limitMinutes: 20,
      zones: [],
      drones: [{ droneId: 'ttf-0001', droneName: 'Drone 1', number: 1 }],
    })

  it('puts a child with no tablet on a Drone', () => {
    const next = seatStudentByHand(withOne(), 'ttf-0001', 'Amira', 5_000)

    expect(next.seats).toHaveLength(1)
    expect(next.seats[0]?.name).toBe('Amira')
    expect(next.seats[0]?.droneId).toBe('ttf-0001')
  })

  it('renames whoever took it, because the Teacher can see both children', () => {
    const joined = joinClassroomAsStudent(withOne(), 'Ben', 1_000, 'stu-ben').session
    const taken = takeDroneSeat(joined, 'stu-ben', 'ttf-0001')

    const next = seatStudentByHand(taken, 'ttf-0001', 'Amira', 5_000)

    expect(next.seats).toHaveLength(1)
    expect(next.seats[0]?.name).toBe('Amira')
  })

  it('ignores an empty name and a Drone that is not in the Lesson', () => {
    expect(seatStudentByHand(withOne(), 'ttf-0001', '   ', 5_000).seats).toHaveLength(0)
    expect(seatStudentByHand(withOne(), 'ttf-9999', 'Amira', 5_000).seats).toHaveLength(0)
  })

  it('frees a Drone in one tap', () => {
    const seated = seatStudentByHand(withOne(), 'ttf-0001', 'Amira', 5_000)
    expect(freeDroneSeat(seated, 'ttf-0001').seats).toHaveLength(0)
    // A Drone nobody has is already free, so this is a no-op rather than an error.
    expect(freeDroneSeat(withOne(), 'ttf-0001').seats).toHaveLength(0)
  })

  /*
   * A Student who picks up a second iPad gets a second `studentId`, so their own craft would
   * be greyed out against them forever. Two children with one first name is what this gets
   * wrong, and it gets it wrong where the Teacher can see it.
   */
  it('lets a Student reclaim their own Drone from a device that died', () => {
    const dead = joinClassroomAsStudent(withOne(), 'Amira', 1_000, 'stu-old').session
    const holding = takeDroneSeat(dead, 'stu-old', 'ttf-0001')
    window.localStorage.removeItem(STUDENT_SEAT_KEY)
    const fresh = joinClassroomAsStudent(holding, 'Amira', 2_000, 'stu-new').session

    expect(canTakeDrone(fresh, 'stu-new', 'ttf-0001')).toBe(true)
    const reclaimed = takeDroneSeat(fresh, 'stu-new', 'ttf-0001')

    expect(reclaimed.seats).toHaveLength(1)
    expect(reclaimed.seats[0]?.studentId).toBe('stu-new')
    expect(reclaimed.seats[0]?.droneId).toBe('ttf-0001')
  })

  it('still refuses a Drone another child has', () => {
    const first = joinClassroomAsStudent(withOne(), 'Amira', 1_000, 'stu-amira').session
    const holding = takeDroneSeat(first, 'stu-amira', 'ttf-0001')
    window.localStorage.removeItem(STUDENT_SEAT_KEY)
    const second = joinClassroomAsStudent(holding, 'Ben', 2_000, 'stu-ben').session

    expect(canTakeDrone(second, 'stu-ben', 'ttf-0001')).toBe(false)
    expect(takeDroneSeat(second, 'stu-ben', 'ttf-0001').seats).toHaveLength(2)
  })
})
