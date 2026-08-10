import { DEFAULT_CLASSROOM_FLEET_SIZE } from '@techtechflight/fleet-core/simulator'

/**
 * How many Drones the browser Fleet runs, for a board with no ground station behind it.
 *
 * There is no cap. A school buys as many as it buys, and software that refused the
 * twenty-first would be telling a Teacher their classroom is wrong. What the board owes them
 * instead is honesty about what it can show: above `COMFORTABLE_BOARD_SIZE` the strips get
 * denser, and past that no screen fits them all at once.
 *
 * This is the **simulated** Fleet only. A ground station registers its own set, which is a
 * property of the school's hardware rather than of this browser, and a number typed here must
 * never look as though it added an aircraft to a room.
 */

export const CLASSROOM_FLEET_SIZE_KEY = 'techtechflight:classroom-fleet-size'
export const CLASSROOM_FLEET_SIZE_EVENT = 'techtechflight:classroom-fleet-size'

/**
 * Re-exported so a screen never reaches past the seam for it.
 *
 * `components` and `app` may not import `fleet-core/simulator` — the rule is one import
 * specifier, checked by `import-boundaries.test.ts`, rather than an agreement about a
 * directory. A default Fleet size is a number a screen legitimately needs, so it comes
 * through here.
 */
export { DEFAULT_CLASSROOM_FLEET_SIZE }

/**
 * How many Drones a board is **designed** for, which is not a limit on how many it takes.
 *
 * A display fact and not a Fleet one, which is why it lives here rather than beside
 * `classroomFleet`. Above roughly two dozen no screen shows every strip at once and stays
 * glanceable, so the list gets denser. Adding Drone 47 works; it simply will not all be
 * visible.
 */
export const COMFORTABLE_BOARD_SIZE = 24

/**
 * Above this the board stops being a board and starts being a spreadsheet.
 *
 * Not a limit and not enforced. It is what the input warns about, so a Teacher typing 200
 * finds out from the software rather than from a lesson.
 */
export const UNSUPERVISABLE_SIZE = 60

export function readClassroomFleetSize(): number {
  if (typeof window === 'undefined') return DEFAULT_CLASSROOM_FLEET_SIZE
  try {
    const raw = window.localStorage.getItem(CLASSROOM_FLEET_SIZE_KEY)
    if (raw === null) return DEFAULT_CLASSROOM_FLEET_SIZE
    const size = Number.parseInt(raw, 10)
    return Number.isInteger(size) && size >= 1 ? size : DEFAULT_CLASSROOM_FLEET_SIZE
  } catch {
    return DEFAULT_CLASSROOM_FLEET_SIZE
  }
}

export function writeClassroomFleetSize(size: number): boolean {
  if (!Number.isInteger(size) || size < 1) return false
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(CLASSROOM_FLEET_SIZE_KEY, String(size))
  } catch {
    return false
  }
  window.dispatchEvent(new Event(CLASSROOM_FLEET_SIZE_EVENT))
  return true
}

export function subscribeClassroomFleetSize(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const onStorage = (event: StorageEvent) => {
    if (event.key === CLASSROOM_FLEET_SIZE_KEY || event.key === null) onChange()
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener(CLASSROOM_FLEET_SIZE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(CLASSROOM_FLEET_SIZE_EVENT, onChange)
  }
}
