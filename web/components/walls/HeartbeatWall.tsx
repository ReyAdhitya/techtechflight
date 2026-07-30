'use client'

import Link from 'next/link'
import { useFleet } from '@/components/FleetProvider'
import { cn } from '@/lib/utils'
import { heartbeatWallSummary, isHeartbeatAlive } from './heartbeat-wall'
import { WallGrid, WallTile } from './WallGrid'

/**
 * Last Contact at a glance — one dot per Drone in board order.
 *
 * Filled means the link is still live; hollow and muted means Telemetry is Stale or the
 * Drone has not responded yet. Read-only; tap through to detail.
 */
export function HeartbeatWall({ emptyLabel = 'Waiting for the Fleet.' }: { emptyLabel?: string }) {
  const { snapshot, vitals } = useFleet()
  const drones = snapshot.state?.drones

  if (!drones || drones.length === 0) {
    return <p className="m-0 text-body text-ink-muted">{emptyLabel}</p>
  }

  const staleCount = heartbeatWallSummary(
    vitals.map((entry) => {
      const drone = drones.find((d) => d.id === entry.droneId)
      return { stale: drone?.stale ?? false, lastContact: drone?.lastContact ?? null }
    }),
  )

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 font-display text-summary font-medium text-ink">
        <span className="tnum">{staleCount}</span>
        {' stale'}
      </p>
      <WallGrid>
        {vitals.map((entry) => {
          const drone = drones.find((d) => d.id === entry.droneId)
          const alive = isHeartbeatAlive(drone?.stale ?? false, drone?.lastContact ?? null)

          return (
            <WallTile key={entry.droneId} className="relative p-0" data-stale={!alive || undefined}>
              <Link
                href={`/drone?id=${encodeURIComponent(entry.droneId)}`}
                prefetch={false}
                aria-label={`${entry.callsign}, ${alive ? 'responding' : 'stale'}`}
                className="flex min-h-[6rem] items-center gap-3 rounded-sm p-3 text-inherit no-underline hover:text-inherit focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <span
                  className={cn(
                    'size-[0.6875rem] flex-none rounded-full',
                    alive ? 'bg-ink' : 'border-2 border-stale bg-transparent',
                  )}
                  aria-hidden="true"
                  data-alive={alive || undefined}
                />
                <p className="m-0 font-display text-body font-medium text-ink">{entry.callsign}</p>
              </Link>
            </WallTile>
          )
        })}
      </WallGrid>
    </div>
  )
}
