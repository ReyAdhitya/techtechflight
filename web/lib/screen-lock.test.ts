import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  COMMANDS_LOCKED_REASON,
  SCREEN_LOCK_KEY,
  commandLockState,
  lockedCommandLabel,
  readScreenLocked,
  writeScreenLocked,
} from './screen-lock'

describe('screen lock', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it('starts unlocked when nothing is stored', () => {
    expect(readScreenLocked()).toBe(false)
  })

  it('round-trips through localStorage', () => {
    writeScreenLocked(true)
    expect(window.localStorage.getItem(SCREEN_LOCK_KEY)).toBe('1')
    expect(readScreenLocked()).toBe(true)

    writeScreenLocked(false)
    expect(window.localStorage.getItem(SCREEN_LOCK_KEY)).toBe('0')
    expect(readScreenLocked()).toBe(false)
  })

  it('disables every Command control and says why while locked', () => {
    expect(commandLockState(true)).toEqual({
      disabled: true,
      reason: COMMANDS_LOCKED_REASON,
    })
    expect(commandLockState(false)).toEqual({ disabled: false, reason: null })
  })

  it('puts the reason into the Command accessible name', () => {
    expect(lockedCommandLabel('Stop', true)).toBe(`Stop — ${COMMANDS_LOCKED_REASON}`)
    expect(lockedCommandLabel('Land', false)).toBe('Land')
  })
})
