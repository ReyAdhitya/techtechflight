import { afterEach, describe, expect, it } from 'vitest'
import {
  CEILING_BREACH_COUNTS_KEY,
  DEFAULT_CLASSROOM_CEILING_M,
  countBreachesInSeries,
  emptyCeilingBreachState,
  formatCeilingBreachCount,
  isOverClassroomCeiling,
  observeCeilingBreaches,
  readLessonCeilingBreachCount,
  writeLessonCeilingBreachCount,
} from './ceiling-breach-count'

afterEach(() => {
  window.localStorage.removeItem(CEILING_BREACH_COUNTS_KEY)
})

describe('ceiling breach counting for the report', () => {
  it('uses the classroom ceiling default', () => {
    expect(DEFAULT_CLASSROOM_CEILING_M).toBe(3)
    expect(isOverClassroomCeiling(3)).toBe(false)
    expect(isOverClassroomCeiling(3.1)).toBe(true)
    expect(isOverClassroomCeiling(null)).toBe(false)
  })

  it('counts each rising edge, not every sample above the line', () => {
    expect(countBreachesInSeries([2.9, 3.1, 3.5, 2.8, 3.2])).toBe(2)
    expect(countBreachesInSeries([3.1, 3.1, 3.1])).toBe(1)
    expect(countBreachesInSeries([1, 2, 3])).toBe(0)
  })

  it('accumulates per Drone across vitals snapshots', () => {
    let state = emptyCeilingBreachState()
    state = observeCeilingBreaches(state, [
      { droneId: 'a', altitudeM: 3.2 },
      { droneId: 'b', altitudeM: 1 },
    ])
    expect(state.count).toBe(1)

    state = observeCeilingBreaches(state, [
      { droneId: 'a', altitudeM: 3.4 },
      { droneId: 'b', altitudeM: 3.1 },
    ])
    expect(state.count).toBe(2)

    state = observeCeilingBreaches(state, [
      { droneId: 'a', altitudeM: 2 },
      { droneId: 'b', altitudeM: 2 },
    ])
    expect(state.count).toBe(2)

    state = observeCeilingBreaches(state, [{ droneId: 'a', altitudeM: 4 }])
    expect(state.count).toBe(3)
  })

  it('stores a per-lesson count and reads it afterwards', () => {
    expect(readLessonCeilingBreachCount('lesson-1')).toBe(0)
    writeLessonCeilingBreachCount('lesson-1', 4)
    writeLessonCeilingBreachCount('lesson-2', 1)
    expect(readLessonCeilingBreachCount('lesson-1')).toBe(4)
    expect(readLessonCeilingBreachCount('lesson-2')).toBe(1)
    expect(formatCeilingBreachCount(0)).toBe('0 ceiling breaches')
    expect(formatCeilingBreachCount(1)).toBe('1 ceiling breach')
    expect(formatCeilingBreachCount(4)).toBe('4 ceiling breaches')
  })
})
