import { describe, expect, it } from 'vitest'
import {
  craftReturnedHeadcount,
  emptyCraftReturned,
  ensureCraftReturnedLesson,
  isCraftReturned,
  setCraftReturned,
  toggleCraftReturned,
  type CraftRef,
} from './craft-returned'

const crafts: readonly CraftRef[] = [
  { droneId: 'ttf-0001', droneName: 'Drone 1' },
  { droneId: 'ttf-0002', droneName: 'Drone 2' },
  { droneId: 'ttf-0003', droneName: 'Drone 3' },
]

describe('craft returned', () => {
  it('starts with the full headcount still missing', () => {
    const state = emptyCraftReturned('lesson-1')
    const head = craftReturnedHeadcount(state, crafts)
    expect(head).toEqual({
      out: 3,
      returned: 0,
      missing: crafts,
    })
  })

  it('names any craft still missing after some return', () => {
    let state = emptyCraftReturned('lesson-1')
    state = toggleCraftReturned(state, 'ttf-0001')
    state = toggleCraftReturned(state, 'ttf-0003')
    expect(isCraftReturned(state, 'ttf-0001')).toBe(true)

    const head = craftReturnedHeadcount(state, crafts)
    expect(head.out).toBe(3)
    expect(head.returned).toBe(2)
    expect(head.missing.map((craft) => craft.droneName)).toEqual(['Drone 2'])
  })

  it('setCraftReturned is idempotent when already right', () => {
    const base = setCraftReturned(emptyCraftReturned('lesson-1'), 'ttf-0001', true)
    expect(setCraftReturned(base, 'ttf-0001', true)).toBe(base)
  })

  it('resets when the lesson changes', () => {
    const back = toggleCraftReturned(emptyCraftReturned('lesson-1'), 'ttf-0001')
    const next = ensureCraftReturnedLesson(back, 'lesson-2')
    expect(next.returned).toEqual([])
    expect(ensureCraftReturnedLesson(back, 'lesson-1')).toBe(back)
  })
})
