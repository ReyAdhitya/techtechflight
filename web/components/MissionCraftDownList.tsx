'use client'

import type { CommandKind, LocalPosition } from '@techtechflight/contract'
import { homePointWords } from '@/lib/home-point'
import type { MissionCraftStatus } from './ConfirmMissionComplete'
import { cn } from '@/lib/utils'

/**
 * Every Drone on the Mission, and whether it is down yet.
 *
 * Step 11 refuses to seal while anything is still up, and this is what makes that refusal
 * answerable. Before it, the step closed entirely: a Teacher with one Drone still flying got
 * one line of text and no way to act on it, and the Recall that would have fixed it was four
 * steps back on a board they had just left. The refusal is the step (ADR-0026), so the step
 * has to carry the way out of it.
 *
 * Recall and Land are Commands and they are the Teacher's alone (ADR-0011, ADR-0021). They
 * appear only against a Drone that is actually up, because a Command offered to a Drone
 * sitting on the ground is a press that does nothing.
 */
export function MissionCraftDownList({
  craft,
  homeOf,
  onCommand,
}: {
  readonly craft: readonly MissionCraftStatus[]
  /** Where Recall would send this Drone, or null when the board never saw it leave. */
  readonly homeOf?: (droneId: string) => LocalPosition | null
  readonly onCommand: (droneId: string, kind: CommandKind) => void
}) {
  if (craft.length === 0) return null

  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {craft.map((entry) => (
        <li
          key={entry.droneId}
          className={cn(
            'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-surface border bg-surface-1 px-3 py-2',
            entry.airborne ? 'border-info' : 'border-hairline',
          )}
        >
          <span className="font-display text-body font-medium text-ink">{entry.droneName}</span>
          <span
            className={cn(
              'text-value',
              entry.airborne ? 'text-status-not-ready' : 'text-ink-subtle',
            )}
          >
            {entry.airborne ? 'Still airborne' : 'Down'}
          </span>
          {/*
           * Where Recall goes, said on the row Recall is on. It promises the launch point,
           * and until a Drone has been seen leaving the ground there is no launch point to
           * promise, so that reads as absent rather than as a pair of noughts.
           */}
          {entry.airborne && homeOf ? (
            <span className="tnum text-label text-ink-muted">
              Recall to {homePointWords(homeOf(entry.droneId))}
            </span>
          ) : null}
          {entry.airborne ? (
            <span className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onCommand(entry.droneId, 'return-home')}
                className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
              >
                Recall
              </button>
              <button
                type="button"
                onClick={() => onCommand(entry.droneId, 'land')}
                className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
              >
                Land
              </button>
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
