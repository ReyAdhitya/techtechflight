/**
 * Who is holding this browser — Teacher (Flight Deck) or Student (Mission phone).
 *
 * Two answers, and they answer different questions.
 *
 * **The remembered role** (`localStorage`) says what this *device* is for, chosen once at the
 * door. Its only job is routing somebody who opened the bare address: a Teacher's laptop goes
 * to the Mission run, a child's iPad goes to their tablet.
 *
 * **The tab role** (`sessionStorage`) says what this *tab* is showing, and it is decided by the
 * address. It used to be that the remembered role overruled the address, so every new tab
 * inherited the last role anybody picked and one browser could not hold a Teacher board and a
 * Student tablet at the same time — which is exactly what a Teacher needs to demonstrate the
 * product, and what anybody testing it needs on one machine.
 *
 * `sessionStorage` because that is what a tab is. It is not shared with the tab beside it and
 * it goes when the tab does, which is precisely "for as long as that tab is open".
 */

export type BoardRole = 'teacher' | 'student'

export const BOARD_ROLE_KEY = 'techtechflight:board-role'
export const TAB_ROLE_KEY = 'techtechflight:tab-role'
/** Same-tab signal — `storage` only fires across tabs. */
export const BOARD_ROLE_EVENT = 'techtechflight:board-role'

function notifyBoardRoleChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(BOARD_ROLE_EVENT))
}

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
  notifyBoardRoleChanged()
}

export function clearBoardRole(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(BOARD_ROLE_KEY)
  } catch {
    /* ignore */
  }
  notifyBoardRoleChanged()
}

/**
 * What this tab is showing, which the address decided.
 *
 * Null in a tab that has not settled on one yet, and on the server, where there are no tabs.
 */
export function readTabRole(): BoardRole | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(TAB_ROLE_KEY)
    if (raw === 'teacher' || raw === 'student') return raw
  } catch {
    /* ignore */
  }
  return null
}

export function writeTabRole(role: BoardRole): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(TAB_ROLE_KEY, role)
  } catch {
    /* ignore */
  }
}

export function clearTabRole(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(TAB_ROLE_KEY)
  } catch {
    /* ignore */
  }
}
