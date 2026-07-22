import type { DroneId } from '@techtechflight/contract'
import type { alertQueue } from '@/lib/vitals'
import { SEVERITY_PRESENTATION } from '@/lib/vitals-presentation'
import { cn } from '@/lib/utils'

type Queue = ReturnType<typeof alertQueue>

/**
 * What needs the Teacher next, and nothing else.
 *
 * A count and exactly one Alert. Not a list — a list is the system handing back the triage
 * it was built to do, and eleven things on screen at once is a Teacher reading rather than
 * acting. The strips below still carry every Alert for anyone who wants the whole picture;
 * this carries the next thing.
 *
 * The count stays when it reaches zero. A number that disappears makes its return an
 * element materialising rather than a figure changing, and a Teacher glancing up should be
 * reading the same place every time.
 */
export function AttentionBar({
  queue,
  studentFor,
}: {
  readonly queue: Queue
  /** Who is flying it, so the instruction is "speak to Priya" rather than "look at Drone 3". */
  readonly studentFor: (droneId: DroneId) => string | null
}) {
  const worst = queue[0]

  return (
    <section className="flex flex-col gap-2">
      <h1 className="m-0 flex items-baseline gap-3 font-display text-summary font-medium">
        <span className="tnum tracking-[-0.02em]">{queue.length}</span>
        <span className="text-heading text-ink-subtle">
          {queue.length === 1 ? 'thing needs you' : 'things need you'}
        </span>
      </h1>

      {worst === undefined ? (
        <p className="m-0 text-body text-ink-muted">
          Nothing needs you. Every Drone in contact is behaving.
        </p>
      ) : (
        <div
          className={cn('flex flex-col gap-1 border-l-2 pl-3', SEVERITY_PRESENTATION[worst.severity].className)}
          role="status"
          aria-label="What needs you next"
        >
          <p className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-body text-ink">
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
          {studentFor(worst.droneId) !== null && (
            <p className="m-0 text-value text-ink-subtle">
              Flown by {studentFor(worst.droneId)}.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
