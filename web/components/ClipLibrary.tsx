'use client'

import { useSyncExternalStore } from 'react'
import {
  clipCount,
  downloadClip,
  getClipLibrarySnapshot,
  subscribeClipLibrary,
  type SessionClip,
} from '@/lib/clip-library'
import { formatClock } from '@/lib/telemetry-presentation'
import { cn } from '@/lib/utils'

/**
 * Clips captured this session — list and re-download.
 *
 * Mount in the Camera dialog / Control (Integrator). Local session memory only;
 * never a Fleet Command and never a stream URL on Telemetry (ADR-0011).
 */
export function ClipLibrary({
  className,
  droneId,
}: {
  readonly className?: string
  /** When set, only that craft’s clips. Omit for the whole session. */
  readonly droneId?: string
}) {
  const clips = useSyncExternalStore(
    subscribeClipLibrary,
    getClipLibrarySnapshot,
    getClipLibrarySnapshot,
  )
  const visible =
    droneId === undefined ? clips : clips.filter((clip) => clip.droneId === droneId)
  const total = clipCount(visible)

  return (
    <section
      className={cn('flex flex-col gap-2', className)}
      aria-labelledby="clip-library-heading"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3
          id="clip-library-heading"
          className="m-0 font-display text-label font-medium text-ink"
        >
          Clip library
        </h3>
        <p className="m-0 tnum text-value text-ink-subtle">
          {total} {total === 1 ? 'clip' : 'clips'} this session
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="m-0 text-value text-ink-muted">
          No clips captured yet. Record from the camera pane, then re-download here.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {visible.map((clip) => (
            <ClipRow key={clip.id} clip={clip} />
          ))}
        </ul>
      )}
    </section>
  )
}

function ClipRow({ clip }: { readonly clip: SessionClip }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-surface border border-hairline bg-surface-1 px-3 py-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-value text-ink">{clip.droneName}</span>
        <span className="tnum text-label text-ink-subtle">
          {formatClock(clip.capturedAt)} · {clip.filename}
        </span>
      </div>
      <button
        type="button"
        onClick={() => downloadClip(clip.id)}
        className="min-h-11 shrink-0 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
      >
        Download again
      </button>
    </li>
  )
}
