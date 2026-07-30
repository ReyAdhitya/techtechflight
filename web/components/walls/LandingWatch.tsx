'use client'

import Link from 'next/link'
import { useFleet } from '@/components/FleetProvider'
import { cn } from '@/lib/utils'
import { PHASE_PRESENTATION } from '@/lib/vitals-presentation'
import { WallGrid, WallTile } from './WallGrid'
import {
  formatAirborneReadout,
  formatLandingAltitude,
  isLandingRelated,
  landingWallEntries,
  landingWallFocused,
  landingWallSummary,
} from './landing-wall'

/**
 * Landing watch — who is coming down, with height and airborne state at a glance.
 *
 * When any Drone is descending or auto-landing, the wall narrows to those tiles. Otherwise
 * every Drone stays visible with land-relevant vitals. Read-only; each tile opens Drone detail.
 */
export function LandingWatch({ emptyLabel = 'Waiting for the Fleet.' }: { emptyLabel?: string }) {
  const { snapshot, vitals } = useFleet()
  const drones = snapshot.state?.drones

  if (!drones || drones.length === 0) {
    return <p className="m-0 text-body text-ink-muted">{emptyLabel}</p>
  }

  const focused = landingWallFocused(vitals)
  const entries = landingWallEntries(vitals)
  const landingCount = landingWallSummary(vitals)

  return (
    <div className="flex flex-col gap-4">
      <p
        className={cn(
          'm-0 font-display text-summary font-medium',
          landingCount > 0 ? 'text-status-not-ready' : 'text-ink',
        )}
      >
        <span className="tnum">{landingCount}</span>
        {' landing'}
      </p>
      <WallGrid>
        {entries.map((entry) => {
          const drone = drones.find((d) => d.id === entry.droneId)
          const stale = drone?.stale ?? false
          const landing = isLandingRelated(entry)

          return (
            <WallTile
              key={entry.droneId}
              className={cn('relative p-0', landing && 'border-status-not-ready')}
              data-landing={landing || undefined}
            >
              <Link
                href={`/drone?id=${encodeURIComponent(entry.droneId)}`}
                prefetch={false}
                className="flex min-h-[6rem] flex-col gap-2 rounded-sm p-3 text-inherit no-underline hover:text-inherit focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <p className="m-0 font-display text-body font-medium text-ink">{entry.callsign}</p>
                {focused && landing ? (
                  <p className="m-0 text-body font-medium text-status-not-ready">
                    {PHASE_PRESENTATION[entry.phase].label}
                  </p>
                ) : null}
                <p
                  className={cn(
                    'm-0 text-value',
                    stale ? 'text-stale italic' : 'text-ink-subtle',
                  )}
                >
                  {formatAirborneReadout(entry.airborne)}
                </p>
                <p
                  className={cn(
                    'tnum m-0 text-value',
                    stale ? 'text-stale italic' : 'text-ink-subtle',
                  )}
                >
                  {formatLandingAltitude(entry)}
                </p>
              </Link>
            </WallTile>
          )
        })}
      </WallGrid>
    </div>
  )
}
