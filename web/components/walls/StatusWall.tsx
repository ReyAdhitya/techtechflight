'use client'

import Link from 'next/link'
import type { Status } from '@techtechflight/contract'
import { useFleet } from '@/components/FleetProvider'
import { StatusBadge } from '@/components/StatusBadge'
import { formatAge } from '@/lib/age'
import { formatBattery } from '@/lib/battery'
import { cn } from '@/lib/utils'
import type { DroneVitals } from '@/lib/vitals'
import { formatVerticalMovement } from '@/lib/vitals-presentation'
import { WallGrid, WallTile } from './WallGrid'

/**
 * Border-only status accent — same vocabulary as board tiles. Offline recedes rather
 * than gaining a fault colour. Emergency and Fault read stronger at wall scale.
 */
const TILE_STATUS: Record<Status, string> = {
  Ready: 'border-hairline',
  Flying: 'border-hairline',
  'Not Ready': 'border-status-not-ready',
  Fault: 'border-status-fault',
  Offline: 'border-hairline text-ink-muted',
}

function tileAccent(vitals: DroneVitals): string {
  if (vitals.phase === 'emergency') {
    return 'border-2 border-status-fault'
  }
  if (vitals.status === 'Fault') {
    return 'border-status-fault'
  }
  return TILE_STATUS[vitals.status]
}

/**
 * Status wall — every Drone at a glance: name, Status, charge, height, and whether
 * the link is still live. Read-only; each tile opens the Drone detail screen.
 */
export function StatusWall({ emptyLabel = 'Waiting for the Fleet.' }: { emptyLabel?: string }) {
  const { snapshot, vitals } = useFleet()
  const drones = snapshot.state?.drones

  if (!drones || drones.length === 0) {
    return <p className="m-0 text-body text-ink-muted">{emptyLabel}</p>
  }

  return (
    <WallGrid>
      {vitals.map((entry) => {
        const drone = drones.find((d) => d.id === entry.droneId)
        const stale = drone?.stale ?? false
        const height =
          entry.altitudeM !== null ? formatVerticalMovement(entry) : null

        return (
          <WallTile
            key={entry.droneId}
            className={cn(
              'relative p-0',
              tileAccent(entry),
              entry.phase === 'emergency' && 'bg-surface-1',
            )}
            data-status={entry.status}
            data-emergency={entry.phase === 'emergency' || undefined}
          >
            <Link
              href={`/drone?id=${encodeURIComponent(entry.droneId)}`}
              prefetch={false}
              className="flex min-h-[6rem] flex-col gap-2 rounded-sm p-3 no-underline text-inherit hover:text-inherit focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <p className="m-0 font-display text-body font-medium text-ink">{entry.callsign}</p>

              <StatusBadge status={entry.status} />

              <p
                className={cn(
                  'tnum m-0 text-value',
                  stale ? 'text-stale italic' : 'text-ink-subtle',
                )}
              >
                {entry.batteryFraction === null
                  ? 'Charge not reported'
                  : formatBattery(entry.batteryFraction)}
              </p>

              {height ? (
                <p className="tnum m-0 text-value text-ink-subtle">{height}</p>
              ) : null}

              <p
                className={cn(
                  'tnum m-0 text-value',
                  entry.status === 'Offline'
                    ? 'text-inherit'
                    : stale
                      ? 'text-stale italic'
                      : 'text-ink-subtle',
                )}
                data-stale={stale || undefined}
              >
                {entry.responseAgeMs === null
                  ? 'No response yet'
                  : stale
                    ? `Last response ${formatAge(entry.responseAgeMs)}`
                    : `Response ${formatAge(entry.responseAgeMs)}`}
              </p>
            </Link>
          </WallTile>
        )
      })}
    </WallGrid>
  )
}
