import type { DroneId } from '@techtechflight/contract'

/**
 * Which craft is the nominated swap for this prep — one spare, not a spare inventory.
 *
 * Lives in this browser (ADR-0005). Clearing site data clears the nomination. Not a
 * Command and never rides Telemetry (ADR-0011).
 */

export const SPARE_NOMINATION_KEY = 'techtechflight:spare-nomination'

/** The nominated spare's Drone ID, or null when none is marked. */
export function readSpareNomination(): DroneId | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(SPARE_NOMINATION_KEY)
    if (raw === null || raw.trim() === '') return null
    return raw
  } catch {
    return null
  }
}

/**
 * Mark one craft as the swap, or clear with null.
 * Only one spare at a time — writing a new ID replaces the previous.
 */
export function writeSpareNomination(droneId: DroneId | null): void {
  if (typeof window === 'undefined') return
  try {
    if (droneId === null || droneId.trim() === '') {
      window.localStorage.removeItem(SPARE_NOMINATION_KEY)
      return
    }
    window.localStorage.setItem(SPARE_NOMINATION_KEY, droneId)
  } catch {
    // Locked-down school browsers can refuse storage; the in-memory UI still works.
  }
}

/** Resolve the nominated ID against the current Fleet; clears a stale ID quietly. */
export function spareAmongFleet(
  nominatedId: DroneId | null,
  fleetIds: ReadonlySet<string>,
): DroneId | null {
  if (nominatedId === null) return null
  if (!fleetIds.has(nominatedId)) return null
  return nominatedId
}
