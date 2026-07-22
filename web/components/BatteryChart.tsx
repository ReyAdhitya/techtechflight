import type { BatterySample } from '@techtechflight/contract'
import { formatClock } from '@/lib/telemetry-presentation'
import { cn } from '@/lib/utils'

export interface BatteryChartProps {
  readonly samples: readonly BatterySample[]
  /** Earliest moment the ground station still has a record of. */
  readonly since: number
  /** Now, so a Drone that fell silent draws a line that stops rather than one that ends. */
  readonly until: number
  readonly className?: string
}

/**
 * How the charge has moved, drawn by hand rather than by a chart library.
 *
 * Three reasons it is hand-rolled: the board must work in a school with no internet and
 * every byte is bundled (ADR-0002), a charting library would arrive with its own colour
 * and type opinions that this system has spent a lot of effort not having, and the one
 * thing this chart has to get right — a line that *stops* where the Telemetry stopped —
 * is exactly the thing most libraries paper over by interpolating to the edge.
 */
export function BatteryChart({ samples, since, until, className }: BatteryChartProps) {
  if (samples.length < 2) {
    return (
      <p className={cn('m-0 text-value text-ink-subtle', className)}>
        Not enough readings yet to draw a charge history.
      </p>
    )
  }

  const from = Math.min(since, samples[0]!.at)
  const span = Math.max(1, until - from)
  const x = (at: number) => ((at - from) / span) * 100
  const y = (fraction: number) => (1 - fraction) * 40

  const points = samples.map((sample) => `${x(sample.at).toFixed(3)},${y(sample.fraction).toFixed(3)}`)
  const line = `M${points.join(' L')}`
  const first = samples[0]!
  const last = samples.at(-1)!
  const area = `${line} L${x(last.at).toFixed(3)},40 L${x(first.at).toFixed(3)},40 Z`

  /*
   * How far short of the present the last reading falls. A Drone in contact ends flush
   * with the right-hand edge; one that has gone quiet visibly stops short, which is the
   * same "every value carries its age" rule the tiles follow, drawn instead of written.
   *
   * Only said in words once it has been quiet for a real minute. Judging it by where the
   * line lands makes the caption a function of how wide the window happens to be, and a
   * freshly started ground station has a window narrow enough that a Drone heard from a
   * second ago was being announced as silent for 0 min.
   */
  const silentFor = until - last.at
  const stoppedShort = silentFor >= 60_000

  return (
    <figure className={cn('m-0 flex flex-col gap-2', className)}>
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        className="h-32 w-full overflow-visible"
        role="img"
        aria-label={`Charge history: ${Math.round(first.fraction * 100)}% at ${formatClock(
          first.at,
        )}, ${Math.round(last.fraction * 100)}% at ${formatClock(last.at)}`}
      >
        {/* Quarter lines, so a reading can be placed without a labelled axis. */}
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
          <line
            key={fraction}
            x1="0"
            x2="100"
            y1={y(fraction)}
            y2={y(fraction)}
            className="stroke-hairline"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <path d={area} className="fill-ink/8" />
        <path
          d={line}
          fill="none"
          className="stroke-ink"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          // Without this the stroke is squashed by the same non-uniform scale that lets
          // the chart fill its box, and the line reads thinner at one end than the other.
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={x(last.at)} cy={y(last.fraction)} r="3" className="fill-ink" />
      </svg>

      <figcaption className="tnum flex justify-between text-label">
        <span>{formatClock(from)}</span>
        {stoppedShort && (
          <span className="italic text-stale" data-stale="true">
            Nothing heard for {Math.round(silentFor / 60_000)} min
          </span>
        )}
        <span>{formatClock(until)}</span>
      </figcaption>
    </figure>
  )
}
