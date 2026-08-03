import {
  longestAirborne,
  longestAirborneSentence,
  type AirborneCraftInput,
} from '@/lib/longest-airborne'
import { cn } from '@/lib/utils'

/**
 * Who has been up longest — callsign and duration for Control.
 *
 * Absent when nobody is airborne with a known start. Feed `airborneSince` from
 * `AirborneTracker` (Integrator). Does not reorder strips.
 */
export function LongestAirborne({
  craft,
  now,
  className,
}: {
  readonly craft: readonly AirborneCraftInput[]
  readonly now: number
  readonly className?: string
}) {
  const result = longestAirborne(craft, now)
  const sentence = longestAirborneSentence(result)
  if (sentence === null) return null

  return (
    <p
      role="status"
      aria-label={sentence}
      className={cn('tnum m-0 text-body text-ink-subtle', className)}
    >
      {sentence}
    </p>
  )
}
