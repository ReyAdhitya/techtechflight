import type { FleetThresholds, Status, Telemetry } from '@techtechflight/contract'

export interface Ageing {
  readonly telemetry: Telemetry | null
  /** Epoch milliseconds, or null when the Drone has never been heard from. */
  readonly lastContact: number | null
  readonly now: number
  readonly thresholds: FleetThresholds
}

/** Silence long enough that the Drone counts as out of contact. */
function outOfContact({ lastContact, now, thresholds }: Ageing): boolean {
  if (lastContact === null) return true
  return now - lastContact >= thresholds.offlineAfterMs
}

/**
 * Whether Telemetry is old enough that it may no longer be true.
 *
 * Stale is a property of Telemetry; Offline is a Status. A Drone can be both, and that
 * is the intended presentation — last known values, shown with their age. A Drone never
 * heard from has no Telemetry to go stale.
 */
export function isStale(ageing: Ageing): boolean {
  const { lastContact, now, thresholds } = ageing
  if (lastContact === null) return false
  return now - lastContact >= thresholds.staleAfterMs
}

/**
 * Status is derived here and nowhere else. A Telemetry Source reports observations and
 * has no opinion, which keeps the rule in one place and stops a future hardware adapter
 * inventing its own.
 *
 * The branch order is the spec's table, including that an airborne Drone reads as
 * Flying ahead of any fault it is also reporting.
 */
export function deriveStatus(ageing: Ageing): Status {
  const { telemetry, thresholds } = ageing

  if (outOfContact(ageing) || telemetry === null) return 'Offline'
  if (telemetry.airborne) return 'Flying'
  if (telemetry.fault !== null) return 'Fault'
  if (telemetry.batteryFraction < thresholds.usableBatteryFraction) return 'Not Ready'
  return 'Ready'
}
