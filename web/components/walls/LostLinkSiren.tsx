'use client'

import { useFleet } from '@/components/FleetProvider'
import { cn } from '@/lib/utils'

/**
 * Visual siren when any Drone has gone quiet (no-response / Offline).
 *
 * Pulse is decorative — the count and role=alert carry the meaning. Animation is
 * suppressed under prefers-reduced-motion via motion-safe.
 */
export function LostLinkSiren() {
  const { vitals } = useFleet()
  const lost = vitals.filter(
    (entry) =>
      entry.status === 'Offline' ||
      entry.phase === 'no-contact' ||
      entry.alerts.some((alert) => alert.kind === 'no-response'),
  )

  if (lost.length === 0) return null

  return (
    <div
      role="alert"
      data-lost-link="siren"
      className={cn(
        'flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-surface border border-status-fault bg-surface-1 px-4 py-3 text-ink',
        'motion-safe:animate-pulse',
      )}
    >
      <strong className="text-body font-medium">
        <span className="tnum">{lost.length}</span>{' '}
        {lost.length === 1 ? 'Drone has' : 'Drones have'} lost link
      </strong>
      <span className="text-value text-ink-muted">
        Last known Status is still on the wall. Check the craft that went quiet.
      </span>
    </div>
  )
}
