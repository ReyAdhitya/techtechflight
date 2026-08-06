'use client'

import Link from 'next/link'
import { useFleet } from '@/components/FleetProvider'
import { StatusGlyph } from '@/components/StatusBadge'
import { cn } from '@/lib/utils'
import { WallGrid, WallTile } from './WallGrid'
import {
  readyBoardLabel,
  readyBoardSummary,
  READY_BOARD_PRESENTATION,
} from './ready-mapping'

/**
 * Pre-flight board: who is ready to fly before the lesson starts.
 *
 * One tile per Drone in board order. No Commands — glance and tap through to detail.
 */
export function ReadyWall() {
  const { vitals } = useFleet()

  if (vitals.length === 0) {
    return <p className="m-0 text-body text-ink-muted">Waiting for the Fleet.</p>
  }

  const labels = vitals.map(readyBoardLabel)
  const { ready, notReady } = readyBoardSummary(labels)

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 font-display text-summary font-medium text-ink">
        <span className="tnum">{ready}</span>
        {' ready, '}
        <span className="tnum">{notReady}</span>
        {' not ready'}
      </p>
      <WallGrid>
        {vitals.map((entry) => {
          const label = readyBoardLabel(entry)
          const presentation = READY_BOARD_PRESENTATION[label]
          return (
            <WallTile key={entry.droneId}>
              <Link
                href={`/drone?id=${encodeURIComponent(entry.droneId)}`}
                prefetch={false}
                className="flex flex-col gap-2 text-inherit no-underline"
              >
                <p className="m-0 font-display text-body font-medium text-ink">
                  {entry.callsign}
                </p>
                <span
                  className={cn(
                    'inline-flex items-center gap-2 text-value',
                    presentation.className,
                  )}
                >
                  <StatusGlyph shape={presentation.shape} />
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
