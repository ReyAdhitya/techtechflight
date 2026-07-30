import type { DroneVitals } from '@/lib/vitals'

/**
 * Classroom ceiling for the height wall — a teaching default, not a measured room.
 *
 * Scope uses its own adaptive ceiling ladder; nothing shared existed for walls, so this
 * is the single number the height wall compares against until a room model lands.
 */
export const CLASSROOM_CEILING_M = 3

export function isOverCeiling(vitals: DroneVitals): boolean {
  if (vitals.altitudeM === null) return false
  return vitals.altitudeM > CLASSROOM_CEILING_M
}

export function heightWallSummary(vitals: readonly DroneVitals[]): number {
  return vitals.filter(isOverCeiling).length
}

/** One decimal and a fixed suffix so every tile scans in a column. */
export function formatHeightReadout(vitals: DroneVitals): string {
  if (vitals.altitudeM === null) return 'Height not reported'
  return `${vitals.altitudeM.toFixed(1)} m`
}
