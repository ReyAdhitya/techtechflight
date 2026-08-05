/**
 * Who is holding this browser — Teacher (Flight Deck) or Student (Mission phone).
 *
 * Chosen once at the door. Same origin, same deploy; different chrome and different verbs.
 */

export type BoardRole = 'teacher' | 'student'

export const BOARD_ROLE_KEY = 'techtechflight:board-role'

export function readBoardRole(): BoardRole | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(BOARD_ROLE_KEY)
    if (raw === 'teacher' || raw === 'student') return raw
  } catch {
    /* ignore */
  }
  return null
}

export function writeBoardRole(role: BoardRole): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(BOARD_ROLE_KEY, role)
  } catch {
    /* ignore */
  }
}

export function clearBoardRole(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(BOARD_ROLE_KEY)
  } catch {
    /* ignore */
  }
}
