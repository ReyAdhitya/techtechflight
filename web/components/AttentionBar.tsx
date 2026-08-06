'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import * as Dialog from '@radix-ui/react-dialog'
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
 * event. The worst Alert stays on a compact line so Scope and strips do not jump when an
 * Alert arrives; playbook responses open in a dialog over the board, not by growing this
 * bar (globals.css `.attention-bar`, Decisions 2026-07-30 / 2026-08-04).
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
  const [respondOpen, setRespondOpen] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (queue.length === 0) setRespondOpen(false)
  }, [queue.length])

  if (queue.length === 0) {
    return (
      <section className="attention-bar flex flex-col gap-2">
        <h2 className="m-0 flex items-baseline gap-3 font-display text-summary font-medium">
          <span className="tnum tracking-[-0.02em]">0</span>
          <span className="text-heading text-ink-subtle">things need you</span>
        </h2>
        <p className="m-0 text-body text-ink-muted">
          Nothing needs you. Every Drone in contact is behaving.
        </p>
      </section>
    )
  }

  const worst = queue[0]!
  const student = studentFor(worst.droneId)
  const moreCount = queue.length - 1

  const acknowledge = (entry: Entry) => {
    onAcknowledge?.(entry)
    if (entry.droneId === worst.droneId && entry.kind === worst.kind) {
      setRespondOpen(false)
    }
  }

  const respond = (entry: Entry, response: PlaybookResponse, index: number) => {
    onResponse?.(entry, response, index)
    setRespondOpen(false)
  }

  return (
    <section className="attention-bar flex flex-col gap-3">
      <h2 className="m-0 flex items-baseline gap-3 font-display text-summary font-medium">
        <span className="tnum tracking-[-0.02em]">{queue.length}</span>
        <span className="text-heading text-ink-subtle">
          {queue.length === 1 ? 'thing needs you' : 'things need you'}
        </span>
      </h2>

      <article
        className={cn(
          'flex flex-col gap-2 rounded-surface border border-hairline border-l-2 bg-surface-1 px-4 py-2',
          SEVERITY_PRESENTATION[worst.severity].className,
        )}
        aria-labelledby="attention-focused-heading"
      >
        <div className="flex flex-col gap-1 min-[40rem]:flex-row min-[40rem]:flex-wrap min-[40rem]:items-baseline min-[40rem]:justify-between min-[40rem]:gap-x-4">
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
            {student !== null && (
              <span className="text-value text-ink-subtle">Flown by {student}.</span>
            )}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRespondOpen(true)}
              className="min-h-11 w-fit cursor-pointer rounded-pill border border-ink-subtle bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
            >
              Respond
              <span className="visually-hidden">
                {' '}
                · {worst.callsign}, {worst.text}
              </span>
            </button>
            {onAcknowledge && (
              <button
                type="button"
                onClick={() => acknowledge(worst)}
                className="min-h-11 w-fit cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
              >
                I have this
                <span className="visually-hidden">
                  {' '}
                  · {worst.callsign}, {worst.text}
                </span>
              </button>
            )}
          </div>
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
                    onClick={() => acknowledge(entry)}
                    className="mt-1 min-h-11 w-fit cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
                  >
                    I have this
                    <span className="visually-hidden">
                      {' '}
                      · {entry.callsign}, {entry.text}
                    </span>
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </details>

      {respondOpen && (
        <Dialog.Root open onOpenChange={(open) => !open && setRespondOpen(false)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
            <Dialog.Content
              ref={dialogRef}
              aria-labelledby={titleId}
              className="fixed left-1/2 top-1/2 z-50 flex w-[min(36rem,92vw)] max-h-[calc(100vh-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-surface border border-hairline bg-canvas p-4 shadow-none min-[26rem]:p-6"
              onOpenAutoFocus={(event) => {
                event.preventDefault()
                dialogRef.current?.focus()
              }}
              tabIndex={-1}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                <Dialog.Title
                  id={titleId}
                  className="m-0 font-display text-summary font-medium text-ink"
                >
                  Respond · {worst.callsign}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted hover:border-ink hover:text-ink"
                  >
                    Close
                  </button>
                </Dialog.Close>
              </div>

              <p className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-body text-ink">
                <span
                  className={cn(
                    'label rounded-pill border px-2 py-0.5',
                    SEVERITY_PRESENTATION[worst.severity].className,
                  )}
                >
                  {SEVERITY_PRESENTATION[worst.severity].label}
                </span>
                <span>{worst.text}</span>
              </p>
              {student !== null && (
                <p className="m-0 text-value text-ink-subtle">Flown by {student}.</p>
              )}

              {onResponse && (
                <AlertResponseOptions
                  kind={worst.kind}
                  onSelect={(response, index) => respond(worst, response, index)}
                />
              )}

              <div className="flex flex-wrap items-center gap-2">
                {onAcknowledge && (
                  <button
                    type="button"
                    onClick={() => acknowledge(worst)}
                    className="min-h-11 w-fit cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
                  >
                    I have this
                    <span className="visually-hidden">
                      {' '}
                      · {worst.callsign}, {worst.text}
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
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </section>
  )
}
