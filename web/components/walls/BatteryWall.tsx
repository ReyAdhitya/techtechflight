'use client'

import Link from 'next/link'
import { useFleet } from '@/components/FleetProvider'
import { BatteryLevel } from '@/components/BatteryLevel'
import { cn } from '@/lib/utils'
import { WallGrid, WallTile } from './WallGrid'
import { batteryWallSummary, isBatteryCritical } from './battery-wall'

/**
 * Charge across every Drone — one tile per aircraft, read-only.
 *
 * Critical means below the ground station's usable charge threshold, same as the board's
 * low-battery signal. Louder tiles and a summary count so a Teacher sees who needs charge.
 */
export function BatteryWall({ emptyLabel = 'Waiting for the Fleet.' }: { emptyLabel?: string }) {
  const { snapshot, vitals } = useFleet()
  const drones = snapshot.state?.drones

  if (!drones || drones.length === 0) {
    return <p className="m-0 text-body text-ink-muted">{emptyLabel}</p>
  }

  const criticalCount = batteryWallSummary(vitals)

  return (
    <div className="flex flex-col gap-4">
      <p
        className={cn(
          'm-0 font-display text-summary font-medium',
          criticalCount > 0 ? 'text-status-not-ready' : 'text-ink',
        )}
      >
        <span className="tnum">{criticalCount}</span>
        {' critical'}
      </p>
      <WallGrid>
        {vitals.map((entry) => {
          const drone = drones.find((d) => d.id === entry.droneId)
          const stale = drone?.stale ?? false
          const critical = isBatteryCritical(entry)
          const telemetry = drone?.telemetry

          return (
            <WallTile
              key={entry.droneId}
              className={cn('relative p-0', critical && 'border-status-not-ready')}
              data-critical={critical || undefined}
            >
              <Link
                href={`/drone?id=${encodeURIComponent(entry.droneId)}`}
                prefetch={false}
                className="flex min-h-[6rem] flex-col gap-2 rounded-sm p-3 text-inherit no-underline hover:text-inherit focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <p
                  className={cn(
                    'm-0 font-display text-body font-medium',
                    critical ? 'text-status-not-ready' : 'text-ink',
                  )}
                >
                  {entry.callsign}
                </p>

                {telemetry ? (
                  <BatteryLevel telemetry={telemetry} stale={stale} low={critical} />
                ) : (
                  <p className="m-0 text-value text-ink-subtle">No Telemetry yet</p>
                )}
              </Link>
            </WallTile>
          )
        })}
      </WallGrid>
    </div>
  )
}
