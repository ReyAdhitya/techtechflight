'use client'

import Link from 'next/link'
import type { Status } from '@techtechflight/contract'
import { useFleet } from '@/components/FleetProvider'
import { StatusBadge } from '@/components/StatusBadge'
import { formatAge } from '@/lib/age'
import { faultReason } from '@/lib/telemetry-presentation'
import { cn } from '@/lib/utils'
import type { DroneVitals } from '@/lib/vitals'
import { WallGrid, WallTile } from './WallGrid'
import {
  faultMosaicSummary,
  isFaultMosaicPriority,
  sortFaultMosaicEntries,
  type FaultMosaicEntry,
} from './fault-mosaic'

const TILE_STATUS: Record<Status, string> = {
  Ready: 'border-hairline',
  Flying: 'border-hairline',
  'Not Ready': 'border-hairline',
  Fault: 'border-status-fault',
  Offline: 'border-hairline text-ink-muted',
}

function tileAccent(vitals: DroneVitals, priority: boolean): string {
  if (vitals.phase === 'emergency') {
    return 'border-2 border-status-fault'
  }
  if (vitals.status === 'Fault' || priority) {
    return 'border-status-fault'
  }
  return TILE_STATUS[vitals.status]
}

/**
 * Fault mosaic — every Drone, with trouble at the front.
 *
 * Fault, stale, and emergency tiles sort ahead of the rest so a Teacher sees who needs
 * them first. Read-only; each tile opens the Drone detail screen.
 */
export function FaultMosaic({ emptyLabel = 'Waiting for the Fleet.' }: { emptyLabel?: string }) {
  const { snapshot, vitals } = useFleet()
  const drones = snapshot.state?.drones

  if (!drones || drones.length === 0) {
    return <p className="m-0 text-body text-ink-muted">{emptyLabel}</p>
  }

  const entries: FaultMosaicEntry[] = vitals.map((entry, boardIndex) => {
    const drone = drones.find((d) => d.id === entry.droneId)
    return {
      vitals: entry,
      stale: drone?.stale ?? false,
      boardIndex,
    }
  })

  const sorted = sortFaultMosaicEntries(entries)
  const troubledCount = faultMosaicSummary(entries)

  return (
    <div className="flex flex-col gap-4">
      <p
        className={cn(
          'm-0 font-display text-summary font-medium',
          troubledCount > 0 ? 'text-status-fault' : 'text-ink',
        )}
      >
        <span className="tnum">{troubledCount}</span>
        {' troubled'}
      </p>
      <WallGrid>
        {sorted.map(({ vitals: entry, stale }) => {
          const drone = drones.find((d) => d.id === entry.droneId)
          const priority = isFaultMosaicPriority(entry, stale)
          const reason = faultReason(drone?.telemetry ?? null)

          return (
            <WallTile
              key={entry.droneId}
              className={cn(
                'relative p-0',
                tileAccent(entry, priority),
                entry.phase === 'emergency' && 'bg-surface-1',
                !priority && 'opacity-80',
              )}
              data-status={entry.status}
              data-emergency={entry.phase === 'emergency' || undefined}
              data-priority={priority || undefined}
            >
              <Link
                href={`/drone?id=${encodeURIComponent(entry.droneId)}`}
                prefetch={false}
                className="flex min-h-[6rem] flex-col gap-2 rounded-sm p-3 text-inherit no-underline hover:text-inherit focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <p className="m-0 font-display text-body font-medium text-ink">{entry.callsign}</p>

                <StatusBadge status={entry.status} />

                {reason ? (
                  <p className="m-0 text-value text-status-fault">{reason}</p>
                ) : stale ? (
                  <p className="m-0 text-value text-stale italic">Link gone quiet</p>
                ) : null}

                {entry.responseAgeMs !== null ? (
                  <p
                    className={cn(
                      'tnum m-0 text-value',
                      stale ? 'text-stale italic' : 'text-ink-subtle',
                    )}
                    data-stale={stale || undefined}
                  >
                    {stale
                      ? `Last response ${formatAge(entry.responseAgeMs)}`
                      : `Response ${formatAge(entry.responseAgeMs)}`}
                  </p>
                ) : (
                  <p className="m-0 text-value text-ink-subtle">No response yet</p>
                )}
              </Link>
            </WallTile>
          )
        })}
      </WallGrid>
    </div>
  )
}
