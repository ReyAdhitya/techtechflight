'use client'

import {
  playbookFor,
  PRIORITY_WORDS,
  type PlaybookResponse,
} from '@/lib/incident-playbook'
import type { AlertKind } from '@/lib/vitals'
import { cn } from '@/lib/utils'

/**
 * Pressable playbook responses for one Alert — ordered as the incident table lists them.
 *
 * The first choice is what the console recommends; the priority name tells a Teacher why
 * that order exists without making them infer it from the Alert kind alone. Fixed order —
 * responses never reorder when another Alert arrives (DELIBERATE-POSITIONS 1).
 */
export function AlertResponseOptions({
  kind,
  onSelect,
}: {
  readonly kind: AlertKind
  readonly onSelect: (response: PlaybookResponse, index: number) => void
}) {
  const entry = playbookFor(kind)
  if (!entry || entry.responses.length === 0) return null

  return (
    <section
      className="flex flex-col gap-2"
      aria-labelledby={`alert-responses-${kind}-heading`}
    >
      <h3 id={`alert-responses-${kind}-heading`} className="label m-0">
        {entry.title}
      </h3>
      <p className="m-0 text-value text-ink-subtle">{PRIORITY_WORDS[entry.priority]}</p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0" role="list">
        {entry.responses.map((response, index) => (
          <li key={`${response.label}-${index}`}>
            <button
              type="button"
              onClick={() => onSelect(response, index)}
              className={cn(
                'flex w-full min-h-11 cursor-pointer flex-col gap-0.5 rounded-sm border bg-canvas px-3 py-2 text-left text-ink',
                index === 0 ? 'border-ink-subtle' : 'border-hairline',
                'hover:border-ink-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
              )}
            >
              <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-body">
                <span className="font-medium">{response.label}</span>
                {index === 0 ? (
                  <span className="label text-ink-subtle">Recommended</span>
                ) : null}
              </span>
              <span className="text-value text-ink-subtle">{response.detail}</span>
              {response.command !== null ? (
                <span className="label text-ink-muted">Sends a Command to the simulated Fleet</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
