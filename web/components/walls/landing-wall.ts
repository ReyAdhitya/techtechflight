import type { DroneVitals, FlightPhase } from '@/lib/vitals'
import { VERTICAL_DEADBAND_MPS } from '@/lib/vitals'

const LANDING_PHASES: ReadonlySet<FlightPhase> = new Set(['descending', 'auto-landing'])

/**
 * Whether this Drone is in a landing-related phase.
 *
 * Descending and auto-landing are explicit. Airborne→ground is the transition while still
 * up and moving down — covered when phase resolves to descending, or when airborne with a
 * negative vertical rate before phase catches up.
 */
export function isLandingRelated(vitals: DroneVitals): boolean {
  if (LANDING_PHASES.has(vitals.phase)) return true
  if (
    vitals.airborne &&
    vitals.verticalRateMps !== null &&
    vitals.verticalRateMps < -VERTICAL_DEADBAND_MPS
  ) {
    return true
  }
  return false
}

/** True when at least one Drone is landing — the wall narrows to those tiles only. */
export function landingWallFocused(vitals: readonly DroneVitals[]): boolean {
  return vitals.some(isLandingRelated)
}

/** Landing tiles when any exist; otherwise every Drone for a whole-class height read. */
export function landingWallEntries(vitals: readonly DroneVitals[]): readonly DroneVitals[] {
  if (landingWallFocused(vitals)) {
    return vitals.filter(isLandingRelated)
  }
  return vitals
}

export function landingWallSummary(vitals: readonly DroneVitals[]): number {
  return vitals.filter(isLandingRelated).length
}

export function formatAirborneReadout(airborne: boolean): string {
  return airborne ? 'Airborne' : 'On the ground'
}

/** One decimal and a fixed suffix so every tile scans in a column. */
export function formatLandingAltitude(vitals: DroneVitals): string {
  if (vitals.altitudeM === null) return 'Height not reported'
  return `${vitals.altitudeM.toFixed(1)} m`
}
