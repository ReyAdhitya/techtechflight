import type { DroneId } from '@techtechflight/contract'
import type { alertQueue } from '@/lib/vitals'
import { SEVERITY_PRESENTATION } from '@/lib/vitals-presentation'
import { cn } from '@/lib/utils'

type Queue = ReturnType<typeof alertQueue>

/**
 * The whole queue, worst first, as a dock beneath the Attention bar.
 *
 * The bar carries the next thing; this carries every thing still waiting, in the order a
 * controller would work it. Clicking one lights its strip and scrolls it into view — the
 * bar is for acting, the dock is for jumping.
 */
export function ControlAttentionQueue({
  queue,
  studentFor,
  selected,
  onSelect,
}: {
  readonly queue: Queue
  readonly studentFor: (droneId: DroneId) => string | null
  readonly selected: string | null
  readonly onSelect: (entry: Queue[number]) => void
}) {
  if (queue.length === 0) return null

  return (
    <nav aria-label="Attention queue">
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {queue.map((entry) => {
          const student = studentFor(entry.droneId)
          const lit = selected === entry.droneId

          return (
            <li key={`${entry.droneId}:${entry.kind}`}>
              <button
                type="button"
                onClick={() => onSelect(entry)}
                aria-current={lit ? 'true' : undefined}
                className={cn(
                  'flex w-full cursor-pointer flex-col gap-0.5 rounded-surface border-l-2 bg-surface-1 p-2 text-left',
                  SEVERITY_PRESENTATION[entry.severity].className,
                  lit && 'outline outline-2 outline-offset-2 outline-ink',
                )}
              >
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-body text-ink">
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
                </span>
                {student !== null && (
                  <span className="text-value text-ink-subtle">Flown by {student}.</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
