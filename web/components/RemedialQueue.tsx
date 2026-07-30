import Link from 'next/link'
import type { RemedialEntry } from '@/lib/remedial-queue'
import { dismissRemedial } from '@/lib/logbook'

/**
 * Students and Drones flagged for remedial follow-up.
 *
 * Minimal list — name, reason, link to Drone detail. Nothing here sends a Command (ADR-0011).
 */
export function RemedialQueue({
  queue,
  heading = 'Remedial follow-up',
}: {
  readonly queue: readonly RemedialEntry[]
  readonly heading?: string
}) {
  if (queue.length === 0) return null

  return (
    <section className="flex flex-col gap-2">
      <h2 className="label m-0">{heading}</h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {queue.map((entry) => (
          <li
            key={entry.droneId}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 rounded-surface border border-hairline bg-surface-1 px-4 py-3"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <Link
                prefetch={false}
                href={`/drone?id=${encodeURIComponent(entry.droneId)}`}
                className="font-display text-body font-medium text-ink no-underline hover:underline"
              >
                {entry.studentName ?? entry.droneName}
              </Link>
              {entry.studentName && (
                <span className="text-value text-ink-subtle">{entry.droneName}</span>
              )}
              <span className="text-value text-ink-muted">{entry.reason}</span>
            </div>
            <button
              type="button"
              onClick={() => dismissRemedial(entry.droneId)}
              className="min-h-11 shrink-0 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted hover:border-ink hover:text-ink"
            >
              Done
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
