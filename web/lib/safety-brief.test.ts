import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  emptySafetyBrief,
  readSafetyBrief,
  resetSafetyBrief,
  SAFETY_BRIEF_KEY,
  SAFETY_BRIEF_RULES,
  safetyBriefDoneCount,
  toggleSafetyBriefRule,
} from './safety-brief'

beforeEach(() => {
  window.localStorage.removeItem(SAFETY_BRIEF_KEY)
})

afterEach(() => {
  window.localStorage.removeItem(SAFETY_BRIEF_KEY)
})

describe('safety brief', () => {
  it('has a fixed list of classroom rules', () => {
    expect(SAFETY_BRIEF_RULES.length).toBeGreaterThanOrEqual(4)
    for (const rule of SAFETY_BRIEF_RULES) {
      expect(rule.id.length).toBeGreaterThan(0)
      expect(rule.label.length).toBeGreaterThan(10)
    }
  })

  it('ticks persist for the same Lesson and reset for a new one', () => {
    toggleSafetyBriefRule('lesson-1', 'propellers')
    toggleSafetyBriefRule('lesson-1', 'stop')
    expect(readSafetyBrief('lesson-1').checked.propellers).toBe(true)
    expect(safetyBriefDoneCount(readSafetyBrief('lesson-1'))).toBe(2)

    expect(readSafetyBrief('lesson-2')).toEqual(emptySafetyBrief('lesson-2'))
    expect(safetyBriefDoneCount(readSafetyBrief('lesson-2'))).toBe(0)
  })

  it('toggling twice clears a rule', () => {
    toggleSafetyBriefRule('lesson-1', 'eyes')
    toggleSafetyBriefRule('lesson-1', 'eyes')
    expect(readSafetyBrief('lesson-1').checked.eyes).toBeUndefined()
  })

  it('resetSafetyBrief clears every tick for the Lesson', () => {
    toggleSafetyBriefRule('lesson-1', 'land')
    resetSafetyBrief('lesson-1')
    expect(readSafetyBrief('lesson-1')).toEqual(emptySafetyBrief('lesson-1'))
  })

  it('counts done rules at zero when none are ticked', () => {
    expect(safetyBriefDoneCount(emptySafetyBrief('lesson-1'))).toBe(0)
  })
})
