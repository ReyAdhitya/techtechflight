'use client'

import Link from 'next/link'
import type { DroneId } from '@techtechflight/contract'
import type { alertQueue } from '@/lib/vitals'
import type { PlaybookResponse } from '@/lib/incident-playbook'
import { SEVERITY_PRESENTATION } from '@/lib/vitals-presentation'
import { cn } from '@/lib/utils'
import { AlertResponseOptions } from './AlertResponseOptions'

type Queue = ReturnType<typeof alertQueue>
type Entry = Queue[number]

/**
 * What needs the Teacher — one focused Alert at a time (DESIGN §4.2).
 *
 * The count stays visible even at zero so its return is a number changing, not a layout
 * event. The worst Alert is always on the card with recommended responses; the rest of the
 * queue waits in a closed disclosure so triage stays the system's job, not the Teacher's.
 */
export function AttentionBar({
  queue,
  studentFor,
  onAcknowledge,
  onResponse,
}: {
  readonly queue: Queue
  readonly studentFor: (droneId: DroneId) => string | null
  readonly onAcknowledge?: ((entry: Entry) => void) | undefined
  /** Playbook choice for the focused Alert — may send a Command and/or acknowledge. */
  readonly onResponse?:
    | ((entry: Entry, response: PlaybookResponse, index: number) => void)
    | undefined
}) {
  if (queue.length === 0) {
    return (
      <section className="attention-bar flex flex-col gap-2">
        <h1 className="m-0 flex items-baseline gap-3 font-display text-summary font-medium">
          <span className="tnum tracking-[-0.02em]">0</span>
          <span className="text-heading text-ink-subtle">items require action</span>
        </h1>
        <p className="m-0 text-body text-ink-muted">
          No items require action. All Drones in contact are nominal.
        </p>
      </section>
    )
  }

  const worst = queue[0]!
  const student = studentFor(worst.droneId)
  const moreCount = queue.length - 1

  return (
    <section className="attention-bar flex flex-col gap-3">
      <h1 className="m-0 flex items-baseline gap-3 font-display text-summary font-medium">
        <span className="tnum tracking-[-0.02em]">{queue.length}</span>
        <span className="text-heading text-ink-subtle">
          {queue.length === 1 ? 'item requires action' : 'items require action'}
        </span>
      </h1>

      <article
        className={cn(
          'flex flex-col gap-3 rounded-surface border border-hairline border-l-2 bg-surface-1 px-4 py-3',
          SEVERITY_PRESENTATION[worst.severity].className,
        )}
        aria-labelledby="attention-focused-heading"
      >
        <div className="flex flex-col gap-1">
          <p
            id="attention-focused-heading"
            className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-body text-ink"
          >
            <span
              className={cn(
                'label rounded-pill border px-2 py-0.5',
                SEVERITY_PRESENTATION[worst.severity].className,
              )}
            >
              {SEVERITY_PRESENTATION[worst.severity].label}
            </span>
            <strong className="font-medium">{worst.callsign}</strong>
            <span>{worst.text}</span>
          </p>
          {student !== null && (
            <p className="m-0 text-value text-ink-subtle">Flown by {student}.</p>
          )}
        </div>

        {onResponse && (
          <AlertResponseOptions
            kind={worst.kind}
            onSelect={(response, index) => onResponse(worst, response, index)}
          />
        )}

        <div className="flex flex-wrap items-center gap-2">
          {onAcknowledge && (
            <button
              type="button"
              onClick={() => onAcknowledge(worst)}
              className="min-h-11 w-fit cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
            >
              I have this
              <span className="visually-hidden">
                {' '}
                — {worst.callsign}, {worst.text}
              </span>
            </button>
          )}
          <Link
            prefetch={false}
            href={`/drone?id=${encodeURIComponent(worst.droneId)}`}
            className="inline-flex min-h-11 items-center rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted no-underline hover:border-ink hover:text-ink"
          >
            View Drone details
          </Link>
        </div>
      </article>

      <details className="rounded-surface border border-hairline bg-surface-1 open:pb-3 [&[open]>summary>span:first-child]:rotate-90">
        <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="text-ink-muted transition-transform" aria-hidden="true">
            ▸
          </span>
          <span className="text-value text-ink-subtle">
            {moreCount === 0
              ? 'Full queue'
              : moreCount === 1
                ? '1 more in the queue'
                : `${moreCount} more in the queue`}
          </span>
        </summary>

        <ul
          className="m-0 flex list-none flex-col gap-3 border-t border-hairline px-4 pt-3"
          role="list"
          aria-label="Items requiring action"
        >
          {queue.map((entry) => {
            const flownBy = studentFor(entry.droneId)
            return (
              <li
                key={`${entry.droneId}:${entry.kind}`}
                className={cn(
                  'flex flex-col gap-1 border-l-2 pl-3',
                  SEVERITY_PRESENTATION[entry.severity].className,
                )}
              >
                <p className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-body text-ink">
                  <span
                    className={cn(
                      'label rounded-pill border px-2 py-0.5',
                      SEVERITY_PRESENTATION[entry.severity].className,
                    )}
                  >
                    {SEVERITY_PRESENTATION[entry.severity].label}
                  </span>
                  <strong className="font-medium">{entry.callsign}</strong>
                  <span>{entry.text}</span>
                </p>
                {flownBy !== null && (
                  <p className="m-0 text-value text-ink-subtle">Flown by {flownBy}.</p>
                )}
                {onAcknowledge && (
                  <button
                    type="button"
                    onClick={() => onAcknowledge(entry)}
                    className="mt-1 min-h-11 w-fit cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
                  >
                    I have this
                    <span className="visually-hidden">
                      {' '}
                      — {entry.callsign}, {entry.text}
                    </span>
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </details>
    </section>
  )
}
