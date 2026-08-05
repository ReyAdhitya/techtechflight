import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CLEARANCES_KEY, anyClearanceGranted, readClearances, writeClearances } from './clearance-store'
import { emptyClearanceState, grantClearance } from './clearance'

/**
 * The one line of storage the clearance queue was missing.
 *
 * `clearance.ts` was written pure and tested pure, and nothing ever held the state it
 * returned, which is how a whole step of the Mission run came to be unreachable.
 */

beforeEach(() => {
  window.localStorage.removeItem(CLEARANCES_KEY)
})

afterEach(() => {
  window.localStorage.removeItem(CLEARANCES_KEY)
})

describe('where clearances live', () => {
  it('starts empty', () => {
    expect(readClearances('lesson-1').records).toEqual([])
  })

  it('keeps a grant across a reload of the board', () => {
    const granted = grantClearance(
      emptyClearanceState(),
      'ttf-0001',
      'mission-1',
      'Teacher',
      1_000,
    )
    writeClearances('lesson-1', granted)

    expect(readClearances('lesson-1').records).toHaveLength(1)
    expect(anyClearanceGranted(readClearances('lesson-1'), 'mission-1')).toBe(true)
  })

  /* Yesterday's period 3 must not arrive already cleared for takeoff. */
  it('does not carry a grant into another Lesson', () => {
    writeClearances(
      'lesson-1',
      grantClearance(emptyClearanceState(), 'ttf-0001', 'mission-1', 'Teacher', 1_000),
    )

    expect(readClearances('lesson-2').records).toEqual([])
  })

  it('reads nothing rather than throwing on a store somebody else wrote', () => {
    window.localStorage.setItem(CLEARANCES_KEY, 'not json')
    expect(readClearances('lesson-1').records).toEqual([])

    window.localStorage.setItem(CLEARANCES_KEY, JSON.stringify({ lessonId: 'lesson-1' }))
    expect(readClearances('lesson-1').records).toEqual([])
  })

  it('does not count a request that was never granted', () => {
    writeClearances('lesson-1', {
      records: [
        {
          droneId: 'ttf-0001',
          missionId: 'mission-1',
          requestedAt: 1_000,
          grantedAt: null,
          grantedBy: null,
          endedAt: null,
        },
      ],
    })

    expect(anyClearanceGranted(readClearances('lesson-1'), 'mission-1')).toBe(false)
  })
})
