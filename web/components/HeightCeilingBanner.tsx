'use client'

import { cn } from '@/lib/utils'
import type { DroneVitals } from '@/lib/vitals'
import { CLASSROOM_CEILING_M, isOverCeiling } from '@/components/walls/height-wall'

/**
 * Warns on Control when any Drone is above the classroom ceiling default.
 *
 * Read-only — no Command path (ADR-0011). Compact so it does not shove the Scope down.
 */
export function HeightCeilingBanner({ vitals }: { vitals: readonly DroneVitals[] }) {
  const over = vitals.filter(isOverCeiling)
  if (over.length === 0) return null

  return (
    <p
      role="alert"
      className={cn(
        'm-0 rounded-surface border border-status-not-ready bg-surface-1 px-4 py-2 text-value text-status-not-ready',
      )}
    >
      <span className="tnum font-medium">{over.length}</span>
      {over.length === 1 ? ' Drone' : ' Drones'} above{' '}
      <span className="tnum">{CLASSROOM_CEILING_M}</span> m — {over.map((entry) => entry.callsign).join(', ')}
    </p>
  )
}
