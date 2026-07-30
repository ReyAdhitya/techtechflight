/**
 * Demo teacher PIN — session unlock only, not authentication.
 *
 * Hardcoded until a school identity model exists. Unlocked state lives in sessionStorage
 * so a reload in the same tab keeps access; closing the tab clears it.
 */
export const DEMO_TEACHER_PIN = '4242'

const STORAGE_KEY = 'teacher-pin-unlocked'

export function isTeacherPinUnlocked(): boolean {
  if (typeof sessionStorage === 'undefined') return false
  return sessionStorage.getItem(STORAGE_KEY) === '1'
}

export function unlockTeacherPin(pin: string): boolean {
  if (pin !== DEMO_TEACHER_PIN) return false
  sessionStorage.setItem(STORAGE_KEY, '1')
  return true
}

export function lockTeacherPin(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}
