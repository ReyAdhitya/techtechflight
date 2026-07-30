'use client'

import Link from 'next/link'
import { useFleet } from '@/components/FleetProvider'
import { StatusGlyph } from '@/components/StatusBadge'
import { cn } from '@/lib/utils'
import { WallGrid, WallTile } from './WallGrid'
import {
  landedBoardLabel,
  LANDED_BOARD_PRESENTATION,
  landedWallSummary,
} from './landed-wall'

/**
 * End-lesson landed board — who is down and who is still airborne.
 *
 * One tile per Drone in board order. Green when landed, red when still flying. Read-only;
 * tap through to Drone detail.
 */
export function LandedWall({ emptyLabel = 'Waiting for the Fleet.' }: { emptyLabel?: string }) {
  const { snapshot, vitals } = useFleet()
  const drones = snapshot.state?.drones

  if (!drones || drones.length === 0) {
    return <p className="m-0 text-body text-ink-muted">{emptyLabel}</p>
  }

  const { landed, stillFlying } = landedWallSummary(vitals)

  return (
    <div className="flex flex-col gap-4">
      <p
        className={cn(
          'm-0 font-display text-summary font-medium',
          stillFlying > 0 ? 'text-status-fault' : 'text-ink',
        )}
      >
        <span className="tnum">{landed}</span>
        {' landed · '}
        <span className="tnum">{stillFlying}</span>
        {' still flying'}
      </p>
      <WallGrid>
        {vitals.map((entry) => {
          const label = landedBoardLabel(entry)
          const presentation = LANDED_BOARD_PRESENTATION[label]
          return (
            <WallTile
              key={entry.droneId}
              className={cn('relative p-0', presentation.borderClassName)}
              data-landed={label === 'Landed' || undefined}
              data-still-flying={label === 'Still flying' || undefined}
            >
              <Link
                href={`/drone?id=${encodeURIComponent(entry.droneId)}`}
                prefetch={false}
                aria-label={`${entry.callsign}, ${presentation.label}`}
                className="flex min-h-[6rem] flex-col gap-2 rounded-sm p-3 text-inherit no-underline hover:text-inherit focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <p className="m-0 font-display text-body font-medium text-ink">{entry.callsign}</p>
                <span
                  className={cn(
                    'inline-flex items-center gap-2 text-value',
                    presentation.className,
                  )}
                >
                  <StatusGlyph shape="filled" />
                  {presentation.label}
                </span>
              </Link>
            </WallTile>
          )
        })}
      </WallGrid>
    </div>
  )
}
