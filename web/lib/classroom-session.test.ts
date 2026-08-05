import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  grantSeatClearance,
  joinClassroomAsStudent,
  mintClassroomCode,
  normalizeClassroomCode,
  openClassroom,
  requestTakeoff,
  resetClassroomForTests,
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
