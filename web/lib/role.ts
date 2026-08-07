/**
 * Who is holding this browser — Teacher (Flight Deck) or Student (Mission phone).
 *
 * Chosen once at the door. Same origin, same deploy; different chrome and different verbs.
 */

export type BoardRole = 'teacher' | 'student'

export const BOARD_ROLE_KEY = 'techtechflight:board-role'
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

/**
 * A role is a fact about one device, so a prerendered page has none to read.
 *
 * Returning null makes the exported HTML and the hydrating client agree on the closed
 * door. The real role arrives on the first commit after hydration, which is why the gate
 * can still keep Teacher chrome away from a Student without rendering it first.
 */
export function readServerBoardRole(): BoardRole | null {
  return null
}

/** Both tabs of one laptop, and both halves of a role switch in this one. */
export function subscribeBoardRole(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    // `key === null` is a whole-storage clear, which takes the role with it.
    if (event.key === BOARD_ROLE_KEY || event.key === null) onChange()
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener(BOARD_ROLE_EVENT, onChange)

  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(BOARD_ROLE_EVENT, onChange)
  }
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
