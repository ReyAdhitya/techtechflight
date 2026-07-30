import { describe, expect, it, beforeEach } from 'vitest'
import { DEMO_TEACHER_PIN, isTeacherPinUnlocked, lockTeacherPin, unlockTeacherPin } from './teacher-pin'

describe('teacher PIN session gate', () => {
  beforeEach(() => {
    lockTeacherPin()
  })

  it('starts locked and accepts the demo PIN', () => {
    expect(isTeacherPinUnlocked()).toBe(false)
    expect(unlockTeacherPin('0000')).toBe(false)
    expect(unlockTeacherPin(DEMO_TEACHER_PIN)).toBe(true)
    expect(isTeacherPinUnlocked()).toBe(true)
  })

  it('clears on lock', () => {
    unlockTeacherPin(DEMO_TEACHER_PIN)
    lockTeacherPin()
    expect(isTeacherPinUnlocked()).toBe(false)
  })
})
