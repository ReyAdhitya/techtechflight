import type { FleetEvent } from '@techtechflight/contract'
import { formatAge } from '@/lib/age'
import { EVENT_VERB, formatClock } from '@/lib/telemetry-presentation'
import { cn } from '@/lib/utils'

export interface EventTimelineProps {
  readonly events: readonly FleetEvent[]
  /** Now, so each entry can carry its age the way every other value on the board does. */
  readonly now: number
  /** Shown when there is nothing to list, so an empty timeline explains itself. */
  readonly emptyMessage?: string
  readonly limit?: number
}

/**
 * What happened, most recent first.
 *
 * Severity is carried by a rail and by the words, never by colour alone — the same three
 * channels the tiles use. Routine entries are deliberately quiet: a timeline that shouted
 * every take-off would train a Teacher to skim past the two lines that matter.
 */
export function EventTimeline({ events, now, emptyMessage, limit }: EventTimelineProps) {
  const newestFirst = [...events].sort((a, b) => b.at - a.at).slice(0, limit ?? events.length)

  if (newestFirst.length === 0) {
    return (
      <p className="m-0 text-value text-ink-subtle">
        {emptyMessage ?? 'Nothing has happened yet.'}
      </p>
    )
  }

  return (
    <ol className="m-0 flex list-none flex-col gap-0 p-0">
      {newestFirst.map((event, index) => {
        const previous = newestFirst[index - 1]
        // One heading per clock minute, so a burst of activity reads as a burst.
        const newMinute =
          !previous || Math.floor(previous.at / 60_000) !== Math.floor(event.at / 60_000)

        return (
          <li key={event.id} className="flex flex-col">
            {newMinute && (
              <span className="tnum label mt-4 first:mt-0">{formatClock(event.at)}</span>
            )}
            <div
              className={cn(
                'flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-l-2 py-1.5 pl-3',
                event.severity === 'fault'
                  ? 'border-status-fault'
                  : event.severity === 'attention'
                    ? 'border-status-not-ready'
                    : 'border-hairline',
              )}
              data-severity={event.severity}
            >
              <span className="font-display text-body font-medium">{event.droneName}</span>
              <span
                className={cn(
                  'text-value',
                  event.severity === 'fault'
                    ? 'text-status-fault'
                    : event.severity === 'attention'
                      ? 'text-status-not-ready'
                      : 'text-ink-muted',
                )}
              >
                {EVENT_VERB[event.kind]}
              </span>
              {event.detail && (
                <span className="text-value text-ink-subtle">— {event.detail}</span>
              )}
              <span className="tnum ml-auto text-value text-ink-subtle">
                {formatAge(Math.max(0, now - event.at))}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
