'use client'

import type { Logbook } from '@/lib/logbook'
import { WAITING_LIST_EMPTY, waitingListNames } from '@/lib/waiting-list'

/**
 * Who flies next — ordered unassigned Students for the Lesson screen.
 *
 * Pure view over the Logbook. Mounting stays with the Integrator; this component takes
 * the book so it can render under any screen without owning the store subscription.
 */
export function WaitingList({ book }: { readonly book: Logbook }) {
  const waiting = waitingListNames(book)

  return (
    <section className="flex flex-col gap-3" aria-labelledby="waiting-list-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="waiting-list-heading" className="label m-0">
          Waiting to fly
        </h2>
        <p className="m-0 text-value text-ink-subtle">
          <span className="tnum">{waiting.length}</span>
          {' waiting'}
        </p>
      </div>

      {waiting.length === 0 ? (
        <p className="m-0 text-value text-ink-muted">{WAITING_LIST_EMPTY}</p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {waiting.map((name, index) => (
            <li
              key={name}
              className="flex items-baseline gap-3 rounded-surface border border-hairline bg-surface-1 px-3 py-2"
            >
              <span className="tnum w-8 shrink-0 text-value text-ink-muted" aria-hidden="true">
                {index + 1}
              </span>
              <span className="font-display text-body font-medium text-ink">{name}</span>
              {index === 0 ? (
                <span className="text-caption text-ink-subtle">Next</span>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
