'use client'

import type { DroneId } from '@techtechflight/contract'
import type { alertQueue } from '@/lib/vitals'
import { SEVERITY_PRESENTATION } from '@/lib/vitals-presentation'
import { cn } from '@/lib/utils'

type Queue = ReturnType<typeof alertQueue>
type Entry = Queue[number]

/**
 * What needs the Teacher — count always visible, full list in a closed disclosure.
 *
 * The old single-item carousel swapped the line as Alerts arrived or were acknowledged,
 * which read as the page moving. A static count + dropdown keeps the board still; open
 * only when the Teacher wants the queue.
 */
export function AttentionBar({
  queue,
  studentFor,
  onAcknowledge,
}: {
  readonly queue: Queue
  readonly studentFor: (droneId: DroneId) => string | null
  readonly onAcknowledge?: ((entry: Entry) => void) | undefined
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

  return (
    <section className="attention-bar flex flex-col gap-2">
      <details className="rounded-surface border border-hairline bg-surface-1 open:pb-3 [&[open]>summary>span:first-child]:rotate-90">
        <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="text-ink-muted transition-transform" aria-hidden="true">
            ▸
          </span>
          <h1 className="m-0 flex items-baseline gap-3 font-display text-summary font-medium">
            <span className="tnum tracking-[-0.02em]">{queue.length}</span>
            <span className="text-heading text-ink-subtle">
              {queue.length === 1 ? 'item requires action' : 'items require action'}
            </span>
          </h1>
          <span
            className={cn(
              'label rounded-pill border px-2 py-0.5',
              SEVERITY_PRESENTATION[worst.severity].className,
            )}
          >
            {SEVERITY_PRESENTATION[worst.severity].label}
          </span>
          <span className="min-w-0 truncate text-value text-ink-subtle">
            {worst.callsign}: {worst.text}
          </span>
        </summary>

        <ul
          className="m-0 flex list-none flex-col gap-3 border-t border-hairline px-4 pt-3"
          role="list"
          aria-label="Items requiring action"
        >
          {queue.map((entry) => {
            const student = studentFor(entry.droneId)
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
                {student !== null && (
                  <p className="m-0 text-value text-ink-subtle">Flown by {student}.</p>
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
