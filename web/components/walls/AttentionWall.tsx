'use client'

import Link from 'next/link'
import type { DroneId } from '@techtechflight/contract'
import { useFleet } from '@/components/FleetProvider'
import { cn } from '@/lib/utils'
import { WallGrid, WallTile } from './WallGrid'
import {
  attentionWallHeadline,
  attentionWallSummary,
  attentionWallTileAccent,
  isAttentionWallTroubled,
} from './attention-wall'

/**
 * Who needs the Teacher — loud tiles for trouble, quiet ones for the rest.
 *
 * Fault, emergency, stale, and unacknowledged alerts read large; nominal Drones shrink to
 * a muted callsign. Read-only; each tile opens Drone detail.
 */
export function AttentionWall({ emptyLabel = 'Waiting for the Fleet.' }: { emptyLabel?: string }) {
  const { snapshot, vitals, isAcknowledged } = useFleet()
  const drones = snapshot.state?.drones

  if (!drones || drones.length === 0) {
    return <p className="m-0 text-body text-ink-muted">{emptyLabel}</p>
  }

  const staleFor = (droneId: DroneId) => drones.find((d) => d.id === droneId)?.stale ?? false
  const troubledCount = attentionWallSummary(vitals, staleFor, isAcknowledged)

  return (
    <div className="flex flex-col gap-4">
      <p
        className={cn(
          'm-0 font-display text-summary font-medium',
          troubledCount > 0 ? 'text-status-not-ready' : 'text-ink',
        )}
      >
        <span className="tnum">{troubledCount}</span>
        {troubledCount === 1 ? ' needs you' : ' need you'}
      </p>
      <WallGrid>
        {vitals.map((entry) => {
          const stale = staleFor(entry.droneId)
          const troubled = isAttentionWallTroubled(entry, stale, isAcknowledged)

          return (
            <WallTile
              key={entry.droneId}
              className={cn(
                'relative p-0',
                troubled ? 'min-h-[8rem]' : 'min-h-0 border-transparent bg-transparent p-0',
                attentionWallTileAccent(entry, stale, troubled, isAcknowledged),
              )}
              data-troubled={troubled || undefined}
              data-stale={stale || undefined}
            >
              <Link
                href={`/drone?id=${encodeURIComponent(entry.droneId)}`}
                prefetch={false}
                className={cn(
                  'flex flex-col text-inherit no-underline hover:text-inherit focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                  troubled ? 'min-h-[8rem] gap-2 rounded-sm p-4' : 'gap-0 rounded-sm p-2',
                )}
              >
                <p
                  className={cn(
                    'm-0 font-display font-medium',
                    troubled ? 'text-heading text-ink' : 'text-caption text-ink-muted',
                  )}
                >
                  {entry.callsign}
                </p>
                {troubled ? (
                  <p className="m-0 text-body text-ink-subtle">
                    {attentionWallHeadline(entry, stale, isAcknowledged)}
                  </p>
                ) : null}
              </Link>
            </WallTile>
          )
        })}
      </WallGrid>
    </div>
  )
}
