/**
 * Classroom screen lock — so a pupil at the laptop cannot press Stop (or any Command).
 *
 * Storage lives here; the toggle is presentation. The Integrator wires `commandLockState`
 * onto every Command control on Control — this module never mounts itself.
 */

export const SCREEN_LOCK_KEY = 'ttf-screen-lock'

/** Said on every disabled Command while locked — colour alone must not carry it (ADR-0004). */
export const COMMANDS_LOCKED_REASON = 'Screen locked — unlock to use Commands'

export function readScreenLocked(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(SCREEN_LOCK_KEY) === '1'
  } catch {
    return false
  }
}

export function writeScreenLocked(locked: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SCREEN_LOCK_KEY, locked ? '1' : '0')
  } catch {
    // localStorage unavailable — caller still holds React state for the session.
  }
}

/**
 * What a Command button needs while the board may be locked.
 *
 * Integrator: `disabled={grounded || lock.disabled}` and surface `lock.reason` in the
 * accessible name (and optionally beside the control) so a locked board never looks broken.
 */
export function commandLockState(locked: boolean): {
  readonly disabled: boolean
  readonly reason: string | null
} {
  return locked
    ? { disabled: true, reason: COMMANDS_LOCKED_REASON }
    : { disabled: false, reason: null }
}

/** Accessible name for a Command control — appends why when locked. */
export function lockedCommandLabel(action: string, locked: boolean): string {
  return locked ? `${action} — ${COMMANDS_LOCKED_REASON}` : action
}
