import { afterEach, describe, expect, it } from 'vitest'
import {
  TEACHER_PIN_KEY,
  checkTeacherPin,
  clearTeacherPin,
  hasTeacherPin,
  isTeacherPinShape,
  setTeacherPin,
} from './teacher-pin'

afterEach(() => {
  clearTeacherPin()
})

describe('the Teacher PIN', () => {
  it('is four digits and nothing else', () => {
    expect(isTeacherPinShape('4821')).toBe(true)
    expect(isTeacherPinShape('482')).toBe(false)
    expect(isTeacherPinShape('48210')).toBe(false)
    expect(isTeacherPinShape('48a1')).toBe(false)
    expect(isTeacherPinShape('')).toBe(false)
    expect(setTeacherPin('12a4')).toBe(false)
    expect(hasTeacherPin()).toBe(false)
  })

  it('opens the board for the right answer and refuses the wrong one', () => {
    expect(setTeacherPin('4821')).toBe(true)
    expect(hasTeacherPin()).toBe(true)
    expect(checkTeacherPin('4821')).toBe(true)
    expect(checkTeacherPin('4822')).toBe(false)
    expect(checkTeacherPin('')).toBe(false)
  })

  /*
   * A glance at the Application tab must not read out the PIN. This is the whole of what the
   * digest is worth, and `teacher-pin.ts` says so; it is pinned here so nobody later stores
   * the digits themselves believing it makes no difference.
   */
  it('does not keep the digits anywhere a glance can read them', () => {
    setTeacherPin('4821')
    expect(window.localStorage.getItem(TEACHER_PIN_KEY)).not.toContain('4821')
  })

  /*
   * First morning. Refusing every answer would lock a Teacher out of their own laptop, so the
   * check passes and the door asks them to choose one instead of asking them to prove one.
   */
  it('has no opinion before a PIN is set', () => {
    expect(hasTeacherPin()).toBe(false)
    expect(checkTeacherPin('0000')).toBe(true)
  })

  it('forgets the old answer when the PIN changes', () => {
    setTeacherPin('4821')
    setTeacherPin('9042')
    expect(checkTeacherPin('4821')).toBe(false)
    expect(checkTeacherPin('9042')).toBe(true)
  })
})
