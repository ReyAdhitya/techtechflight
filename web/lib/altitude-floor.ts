import type { DroneVitals } from '@/lib/vitals'

/**
 * Minimum height a Flying Drone should keep over classroom desks.
 *
 * The classroom ceiling wall uses 3 m as a teaching default; this is the matching floor —
 * below it an airborne craft is skimming desks, not flying a lesson. Configurable so a
 * School can raise it without a code change; the default is the board's starting value.
 */
export const DEFAULT_ALTITUDE_FLOOR_M = 0.5

export const ALTITUDE_FLOOR_KEY = 'techtechflight:altitude-floor-m'

/** Read the configured floor, or the classroom default when nothing is stored. */
export function readAltitudeFloorM(): number {
  if (typeof window === 'undefined') return DEFAULT_ALTITUDE_FLOOR_M
  try {
    const raw = window.localStorage.getItem(ALTITUDE_FLOOR_KEY)
    if (raw === null) return DEFAULT_ALTITUDE_FLOOR_M
    const parsed = Number.parseFloat(raw)
    if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_ALTITUDE_FLOOR_M
    return parsed
  } catch {
    return DEFAULT_ALTITUDE_FLOOR_M
  }
}

export function writeAltitudeFloorM(metres: number): void {
  if (typeof window === 'undefined') return
  if (!Number.isFinite(metres) || metres < 0) return
  try {
    window.localStorage.setItem(ALTITUDE_FLOOR_KEY, String(metres))
  } catch {
    // Locked-down school browsers can refuse storage; the in-memory default still applies.
  }
}

/**
 * Airborne and below the floor — grounded craft sit on desks on purpose and must not warn.
 */
export function isBelowAltitudeFloor(
  vitals: Pick<DroneVitals, 'airborne' | 'altitudeM'>,
  floorM: number = DEFAULT_ALTITUDE_FLOOR_M,
): boolean {
  if (!vitals.airborne) return false
  if (vitals.altitudeM === null) return false
  return vitals.altitudeM < floorM
}

export function dronesBelowAltitudeFloor(
  vitals: readonly DroneVitals[],
  floorM: number = DEFAULT_ALTITUDE_FLOOR_M,
): readonly DroneVitals[] {
  return vitals.filter((entry) => isBelowAltitudeFloor(entry, floorM))
}
