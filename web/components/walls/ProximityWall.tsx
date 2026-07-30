'use client'

import Link from 'next/link'
import { useFleet } from '@/components/FleetProvider'
import { cn } from '@/lib/utils'
import { WallGrid, WallTile } from './WallGrid'
import {
  formatPairLabel,
  formatSeparationReadout,
  pairLinkDroneId,
  proximityPairs,
  proximityWallSummary,
} from './proximity-wall'

/**
 * Close pairs across the class — one tile per conflict, read-only.
 *
 * Uses the same separation threshold as Scope and vitals so a Teacher sees who is inside
 * the warning distance without reading Control strips one by one.
 */
export function ProximityWall({ emptyLabel = 'Waiting for the Fleet.' }: { emptyLabel?: string }) {
  const { snapshot, vitals } = useFleet()
  const drones = snapshot.state?.drones

  if (!drones || drones.length === 0) {
    return <p className="m-0 text-body text-ink-muted">{emptyLabel}</p>
  }

  const pairs = proximityPairs(vitals, drones)
  const pairCount = proximityWallSummary(pairs)

  return (
    <div className="flex flex-col gap-4">
      <p
        className={cn(
          'm-0 font-display text-summary font-medium',
          pairCount > 0 ? 'text-status-not-ready' : 'text-ink',
        )}
      >
        <span className="tnum">{pairCount}</span>
        {pairCount === 1 ? ' close pair' : ' close pairs'}
      </p>
      {pairs.length > 0 ? (
        <WallGrid>
          {pairs.map((pair) => (
            <WallTile
              key={pair.key}
              className="relative border-status-not-ready p-0"
              data-close-pair
            >
              <Link
                href={`/drone?id=${encodeURIComponent(pairLinkDroneId(pair))}`}
                prefetch={false}
                className="flex min-h-[6rem] flex-col gap-2 rounded-sm p-3 text-inherit no-underline hover:text-inherit focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <p className="m-0 font-display text-body font-medium text-ink">
                  {formatPairLabel(pair.callsignA, pair.callsignB)}
                </p>
                <p className="tnum m-0 font-display text-summary font-medium text-status-not-ready">
                  {formatSeparationReadout(pair.separationM)}
                </p>
              </Link>
            </WallTile>
          ))}
        </WallGrid>
      ) : (
        <p className="m-0 text-body text-ink-muted">All clear.</p>
      )}
    </div>
  )
}
