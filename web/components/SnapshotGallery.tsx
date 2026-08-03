'use client'

import { useSyncExternalStore } from 'react'
import {
  getSnapshotGallery,
  snapshotCount,
  subscribeSnapshotGallery,
  type SessionSnapshot,
} from '@/lib/snapshot-gallery'
import { formatClock } from '@/lib/telemetry-presentation'
import { cn } from '@/lib/utils'

/**
 * Stills taken this session — thumbnails with craft and time.
 *
 * Mount in the Camera dialog (Integrator). Session memory only; never a Fleet
 * Command and never a stream URL on Telemetry (ADR-0011).
 */
export function SnapshotGallery({
  className,
  droneId,
}: {
  readonly className?: string
  /** When set, only that craft’s stills. Omit for the whole session. */
  readonly droneId?: string
}) {
  const stills = useSyncExternalStore(
    subscribeSnapshotGallery,
    getSnapshotGallery,
    getSnapshotGallery,
  )
  const visible =
    droneId === undefined
      ? stills
      : stills.filter((still) => still.droneId === droneId)
  const total = snapshotCount(visible)

  return (
    <section
      className={cn('flex flex-col gap-2', className)}
      aria-labelledby="snapshot-gallery-heading"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3
          id="snapshot-gallery-heading"
          className="m-0 font-display text-label font-medium text-ink"
        >
          Snapshot gallery
        </h3>
        <p className="m-0 tnum text-value text-ink-subtle">
          {total} {total === 1 ? 'still' : 'stills'} this session
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="m-0 text-value text-ink-muted">
          No stills yet. Save photo evidence from the camera pane to see them here.
        </p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 min-[26rem]:grid-cols-3">
          {visible.map((still) => (
            <SnapshotTile key={still.id} still={still} />
          ))}
        </ul>
      )}
    </section>
  )
}

function SnapshotTile({ still }: { readonly still: SessionSnapshot }) {
  return (
    <li className="flex flex-col gap-1 rounded-surface border border-hairline bg-surface-1 p-2">
      <img
        src={still.thumbnailUrl}
        alt={`Still from ${still.droneName}`}
        className="aspect-video w-full rounded-surface border border-hairline object-cover"
      />
      <span className="truncate text-value text-ink">{still.droneName}</span>
      <span className="tnum text-label text-ink-subtle">
        {formatClock(still.capturedAt)}
      </span>
    </li>
  )
}
