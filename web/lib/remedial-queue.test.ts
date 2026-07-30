import { describe, expect, it } from 'vitest'
import { mergeRemedialQueue } from './remedial-queue'

describe('mergeRemedialQueue', () => {
  it('keeps existing entries and adds new Drone ids', () => {
    const merged = mergeRemedialQueue(
      [{ droneId: 'a', droneName: 'A', reason: 'One', addedAt: 1 }],
      [{ droneId: 'b', droneName: 'B', reason: 'Two', addedAt: 2 }],
    )
    expect(merged.map((e) => e.droneId).sort()).toEqual(['a', 'b'])
  })

  it('does not duplicate the same Drone', () => {
    const merged = mergeRemedialQueue(
      [{ droneId: 'a', droneName: 'A', reason: 'One', addedAt: 1 }],
      [{ droneId: 'a', droneName: 'A', reason: 'New', addedAt: 2 }],
    )
    expect(merged).toHaveLength(1)
    expect(merged[0]?.reason).toBe('One')
  })
})
