import { DEFAULT_THRESHOLDS } from '@techtechflight/contract'
import type { DroneVitals } from '@/lib/vitals'

/**
 * Whether charge is below what the ground station treats as flyable.
 *
 * Same threshold as vitals `battery-low` and board Not Ready — `usableBatteryFraction`,
 * not a second number invented on the wall.
 */
export function isBatteryCritical(vitals: DroneVitals): boolean {
  if (vitals.batteryFraction === null) return false
  return vitals.batteryFraction < DEFAULT_THRESHOLDS.usableBatteryFraction
}

export function batteryWallSummary(vitals: readonly DroneVitals[]): number {
  return vitals.filter(isBatteryCritical).length
}
