import {
  notYetAirborne,
  notYetAirborneSentence,
  type NotYetAirborneInput,
} from '@/lib/not-yet-airborne'
import { cn } from '@/lib/utils'

/**
 * Who has not taken off yet — grounded craft with an assigned Student, after Lesson start.
 *
 * Absent before the Lesson, and when everyone assigned is already up. Mount on Control;
 * Integrator wires the screen. Does not reorder strips (DELIBERATE-POSITIONS 1).
 */
export function NotYetAirborneNotice({
  craft,
  lessonStarted,
  className,
}: {
  readonly craft: readonly NotYetAirborneInput[]
  readonly lessonStarted: boolean
  readonly className?: string
}) {
  const waiting = notYetAirborne(craft, lessonStarted)
  const sentence = notYetAirborneSentence(waiting)
  if (sentence === null) return null

  return (
    <p
      role="status"
      aria-label={sentence}
      className={cn('m-0 text-body text-ink-subtle', className)}
    >
      {sentence}
    </p>
  )
}
