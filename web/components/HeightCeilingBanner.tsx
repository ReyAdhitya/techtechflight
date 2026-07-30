'use client'

import { cn } from '@/lib/utils'
import type { DroneVitals } from '@/lib/vitals'
import { CLASSROOM_CEILING_M, isOverCeiling } from '@/components/walls/height-wall'

/**
 * Warns on Control when any Drone is above the classroom ceiling default.
 *
 * Read-only — no Command path (ADR-0011). The height wall counts the same way; this is
 * the banner a Teacher sees while working strips, without opening Walls.
 */
export function HeightCeilingBanner({ vitals }: { vitals: readonly DroneVitals[] }) {
  const over = vitals.filter(isOverCeiling)
  if (over.length === 0) return null

  return (
    <div
      role="alert"
      className={cn('rounded-surface border border-status-not-ready bg-surface-1 px-4 py-3')}
    >
      <p className="m-0 font-display text-summary font-medium text-status-not-ready">
        <span className="tnum">{over.length}</span>
        {over.length === 1 ? ' Drone is' : ' Drones are'} above the{' '}
        <span className="tnum">{CLASSROOM_CEILING_M}</span> m ceiling
      </p>
      <p className="m-0 mt-1 text-value text-ink-subtle">
        {over.map((entry) => entry.callsign).join(', ')}
      </p>
    </div>
  )
}
