'use client'

import { useEffect, useRef, useState } from 'react'
import type { DroneState, Status } from '@techtechflight/contract'
import { formatAge } from '@/lib/age'
import { formatTimeToReady } from '@/lib/battery'
import { cn } from '@/lib/utils'
import { BatteryLevel } from './BatteryLevel'
import { StatusBadge } from './StatusBadge'

/**
 * Border-only voltage: colour outlines a tile, it never fills one. Offline recedes
 * instead — it is the normal resting state, not an error, so it loses its surface
 * rather than gaining a colour.
 */
const TILE_STATUS: Record<Status, string> = {
  Ready: 'bg-surface-1 border-hairline',
  Flying: 'bg-surface-1 border-hairline',
  'Not Ready': 'bg-surface-1 border-status-not-ready',
  Fault: 'bg-surface-1 border-status-fault',
  Offline: 'bg-transparent border-hairline text-ink-muted',
}

export interface DroneTileProps {
  readonly drone: DroneState
  /** Null when this Drone has never been heard from. */
  readonly ageMs: number | null
  readonly onOpenDetail: () => void
}

/**
 * One Drone, at a size that reads from a few steps away.
 *
 * Every value carries its age. A Drone that has never been heard from says so plainly
 * rather than showing an empty battery, because a newly added Drone and a failed one
 * must not look identical.
 */
export function DroneTile({ drone, ageMs, onOpenDetail }: DroneTileProps) {
  const neverHeardFrom = drone.lastContact === null
  const offline = drone.status === 'Offline'
  const headingId = `drone-${drone.id}-name`
  const statusChanged = useStatusChanged(drone.status)

  return (
    <article
      className={cn(
        'drone-tile relative flex flex-1 cursor-pointer flex-col gap-3 overflow-hidden rounded-surface border p-4 min-[26rem]:p-6',
        TILE_STATUS[drone.status],
      )}
      data-status={drone.status}
      data-changed={statusChanged || undefined}
      aria-labelledby={headingId}
    >
      {/*
       * No tracking of its own: `.font-display` already sets -0.02em and wins on source
       * order, so the -0.4px that used to sit here had never once applied.
       */}
      <h2 className="font-display text-tile-name font-medium" id={headingId}>
        {drone.name}
      </h2>

      <StatusBadge status={drone.status} />

      {/* Pushed to the foot of the tile so batteries line up across the board. */}
      <div className="mt-auto">
        {drone.telemetry ? (
          <BatteryLevel
            telemetry={drone.telemetry}
            stale={drone.stale}
            low={drone.status === 'Not Ready'}
          />
        ) : (
          <p className={cn('text-value', offline ? 'text-inherit' : 'text-ink-subtle')}>
            No Telemetry yet
          </p>
        )}

        {/*
         * When the Drone is expected back, and only when the ground station has actually
         * watched the charge go in. Amber, matching the Not Ready Status it only ever
         * appears under — it is the same piece of news, told in time rather than in
         * state. Absent rather than empty when there is nothing honest to say, so a
         * Teacher never reads a blank where a number goes and wonders if it is loading.
         */}
        {drone.timeToReadyMs !== null && (
          <p className="tnum mt-1 text-value text-status-not-ready">
            {formatTimeToReady(drone.timeToReadyMs)}
          </p>
        )}
      </div>

      {/*
       * Fading is the meaning here: it marks Telemetry as Stale. The drop from
       * ink-subtle to ink-muted has to be a real step — if both tiers resolved to the
       * same grey the cue would read as decoration, and a Teacher could not tell current
       * from last-known without reading the words.
       *
       * An Offline tile recedes as a whole, so the line inherits the tile's colour
       * rather than out-brightening the Drone's own name.
       */}
      <p
        className={cn(
          'tnum text-value',
          offline ? 'text-inherit' : drone.stale ? 'text-stale italic' : 'text-ink-subtle',
        )}
        data-stale={drone.stale || undefined}
      >
        {/*
         * One sentence in one element, deliberately. The age qualifies the reading
         * rather than being a field of its own, and splitting it into a label and a
         * value would both say something different and break the tests that read this
         * line the way a Teacher does.
         */}
        {neverHeardFrom ? 'Never heard from' : `Heard from ${formatAge(ageMs ?? 0)}`}
      </p>

      {/*
       * A quiet secondary action, deliberately smaller than the pill button height this
       * system asks for — at tile size a 44px lozenge stops reading as secondary. The
       * pointer target is brought back up to 44px by the overlay below, which is why the
       * button is positioned.
       */}
      <button
        type="button"
        className={cn(
          'tile-details label static mt-2 self-start cursor-pointer rounded-pill border px-3.5 py-1.5',
          'border-hairline text-ink-subtle transition-colors',
          'hover:border-ink hover:text-ink',
          'after:absolute after:inset-0 after:content-[""]',
        )}
        onClick={onOpenDetail}
      >
        Details<span className="visually-hidden"> for {drone.name}</span>
      </button>
    </article>
  )
}

/**
 * Status changes are rare and consequential. Mark only a change that happens while the
 * board is open, never the initial Fleet State, so a loaded board sits still.
 */
function useStatusChanged(status: Status): boolean {
  const previous = useRef(status)
  const [changed, setChanged] = useState(false)

  useEffect(() => {
    if (previous.current === status) return

    previous.current = status
    setChanged(false)

    const frame = window.requestAnimationFrame(() => setChanged(true))
    const timeout = window.setTimeout(() => setChanged(false), 1_100)

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timeout)
    }
  }, [status])

  return changed
}
