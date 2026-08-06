'use client'

import { cn } from '@/lib/utils'
import type { DroneVitals } from '@/lib/vitals'
import {
  DEFAULT_ALTITUDE_FLOOR_M,
  dronesBelowAltitudeFloor,
  readAltitudeFloorM,
} from '@/lib/altitude-floor'

/**
 * Warns on Control when any airborne Drone is below the desk-height floor.
 *
 * Read-only — no Command path (ADR-0011). Word + count carry meaning; colour alone does not
 * (ADR-0004). Compact so it sits with Attention without shoving the Scope down.
 */
export function AltitudeFloorNotice({
  vitals,
  floorM,
}: {
  readonly vitals: readonly DroneVitals[]
  /** Override for tests; live board reads the configured floor. */
  readonly floorM?: number
}) {
  const floor = floorM ?? (typeof window === 'undefined' ? DEFAULT_ALTITUDE_FLOOR_M : readAltitudeFloorM())
  const below = dronesBelowAltitudeFloor(vitals, floor)
  if (below.length === 0) return null

  return (
    <p
      role="alert"
      className={cn(
        'm-0 rounded-surface border border-status-not-ready bg-surface-1 px-4 py-2 text-value text-status-not-ready',
      )}
    >
      <span className="tnum font-medium">{below.length}</span>
      {below.length === 1 ? ' Drone' : ' Drones'} below{' '}
      <span className="tnum">{floor}</span> m over the desks ·{' '}
      {below.map((entry) => entry.callsign).join(', ')}. Bring them up.
    </p>
  )
}
