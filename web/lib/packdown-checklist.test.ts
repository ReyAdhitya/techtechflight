import { describe, expect, it } from 'vitest'
import {
  emptyPackdownChecklist,
  ensurePackdownLesson,
  isPackdownTicked,
  packdownCounts,
  setPackdownTick,
  togglePackdownTick,
  type PackdownCraft,
} from './packdown-checklist'

const crafts: readonly PackdownCraft[] = [
  { droneId: 'ttf-0001', droneName: 'Drone 1' },
  { droneId: 'ttf-0002', droneName: 'Drone 2' },
  { droneId: 'ttf-0003', droneName: 'Drone 3' },
]

describe('pack-down checklist', () => {
  it('starts empty for a lesson', () => {
    const state = emptyPackdownChecklist('lesson-1')
    expect(state.ticked).toEqual([])
    expect(packdownCounts(state, crafts)).toEqual({ ticked: 0, total: 3 })
  })

  it('ticks and unticks one craft without touching the others', () => {
    let state = emptyPackdownChecklist('lesson-1')
    state = togglePackdownTick(state, 'ttf-0002')
    expect(isPackdownTicked(state, 'ttf-0002')).toBe(true)
    expect(isPackdownTicked(state, 'ttf-0001')).toBe(false)
    expect(packdownCounts(state, crafts)).toEqual({ ticked: 1, total: 3 })

    state = togglePackdownTick(state, 'ttf-0002')
    expect(isPackdownTicked(state, 'ttf-0002')).toBe(false)
  })

  it('setPackdownTick is idempotent when the value is already right', () => {
    const base = setPackdownTick(emptyPackdownChecklist('lesson-1'), 'ttf-0001', true)
    expect(setPackdownTick(base, 'ttf-0001', true)).toBe(base)
  })

  it('resets every tick when the lesson changes', () => {
    const packed = togglePackdownTick(emptyPackdownChecklist('lesson-1'), 'ttf-0001')
    const next = ensurePackdownLesson(packed, 'lesson-2')
    expect(next.lessonId).toBe('lesson-2')
    expect(next.ticked).toEqual([])
    expect(ensurePackdownLesson(packed, 'lesson-1')).toBe(packed)
  })
})
