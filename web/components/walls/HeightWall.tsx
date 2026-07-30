'use client'

import Link from 'next/link'
import { useFleet } from '@/components/FleetProvider'
import { cn } from '@/lib/utils'
import { WallGrid, WallTile } from './WallGrid'
import {
  formatHeightReadout,
  heightWallSummary,
  isOverCeiling,
} from './height-wall'

/**
 * Height across every Drone — one aligned readout per aircraft, read-only.
 *
 * Tiles highlight when reported height is above the classroom ceiling default so a Teacher
 * can compare the whole class at a glance without reading Control strips one by one.
 */
export function HeightWall({ emptyLabel = 'Waiting for the Fleet.' }: { emptyLabel?: string }) {
  const { snapshot, vitals } = useFleet()
  const drones = snapshot.state?.drones

  if (!drones || drones.length === 0) {
    return <p className="m-0 text-body text-ink-muted">{emptyLabel}</p>
  }

  const overCount = heightWallSummary(vitals)

  return (
    <div className="flex flex-col gap-4">
      <p
        className={cn(
          'm-0 font-display text-summary font-medium',
          overCount > 0 ? 'text-status-not-ready' : 'text-ink',
        )}
      >
        <span className="tnum">{overCount}</span>
        {' over ceiling'}
      </p>
      <WallGrid>
        {vitals.map((entry) => {
          const drone = drones.find((d) => d.id === entry.droneId)
          const stale = drone?.stale ?? false
          const over = isOverCeiling(entry)
          const readout = formatHeightReadout(entry)

          return (
            <WallTile
              key={entry.droneId}
              className={cn('relative p-0', over && 'border-status-not-ready')}
              data-over-ceiling={over || undefined}
            >
              <Link
                href={`/drone?id=${encodeURIComponent(entry.droneId)}`}
                prefetch={false}
                className="flex min-h-[6rem] flex-col gap-2 rounded-sm p-3 text-inherit no-underline hover:text-inherit focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <p className="m-0 font-display text-body font-medium text-ink">{entry.callsign}</p>
                <p
                  className={cn(
                    'tnum m-0 font-display text-summary font-medium',
                    entry.altitudeM === null
                      ? 'text-ink-subtle'
                      : over
                        ? 'text-status-not-ready'
                        : stale
                          ? 'text-stale italic'
                          : 'text-ink',
                  )}
                >
                  {readout}
                </p>
              </Link>
            </WallTile>
          )
        })}
      </WallGrid>
    </div>
  )
}
