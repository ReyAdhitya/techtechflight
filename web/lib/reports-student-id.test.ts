import { describe, expect, it } from 'vitest'
import { studentIdsForLesson } from './reports-student-id'

describe('studentIdsForLesson', () => {
  it('returns unique assignment names', () => {
    const ids = studentIdsForLesson({
      id: '1', label: 'x', startedAt: 0, endedAt: 1, readyAtStart: 1, fleetSize: 1,
      incidents: [], assignments: { a: 'Ada', b: 'Ada', c: 'Bea' },
    } as any)
    expect(ids).toEqual(['Ada', 'Bea'])
  })
})
