import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  grantSeatClearance,
  holdSeatClearance,
  joinClassroomAsStudent,
  markSeatFlown,
  mintClassroomCode,
  normalizeClassroomCode,
  openClassroom,
  requestTakeoff,
  resetClassroomForTests,
  seatHasFlown,
  type ClassroomSeat,
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
      live: true,
      now: 1_000,
    })

    expect(session.code).toHaveLength(4)
    expect(session.live).toBe(true)

    const joined = joinClassroomAsStudent(session, 'Ada', 2_000)
    expect(joined.seat.name).toBe('Ada')
    expect(joined.session.seats).toHaveLength(1)

    const requested = requestTakeoff(joined.session, joined.seat.studentId, 3_000)
    expect(requested.seats[0]?.phase).toBe('awaiting-clearance')

    const granted = grantSeatClearance(requested, joined.seat.studentId, 4_000)
    expect(granted.seats[0]?.phase).toBe('cleared')
    expect(granted.seats[0]?.clearedAt).toBe(4_000)
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
