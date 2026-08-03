import type { LessonRecord } from '@/lib/logbook'
import { exerciseRemaining, formatExerciseRemaining } from '@/lib/exercise-remaining'
import { cn } from '@/lib/utils'

/**
 * Time left in the current Exercise — for every Control strip.
 *
 * Silent when no duration was set (or the plan has run out). Mount beside "Meant to be"
 * on each strip; Integrator wires ControlScreen.
 */
export function ExerciseRemaining({
  lesson,
  now,
  className,
}: {
  readonly lesson: LessonRecord | null
  readonly now: number
  readonly className?: string
}) {
  if (lesson === null) return null
  const remaining = exerciseRemaining(lesson, now)
  if (remaining === null) return null

  const label = formatExerciseRemaining(remaining.remainingMs)

  return (
    <p
      role="status"
      aria-label={`Exercise time left: ${label}`}
      className={cn('tnum m-0 text-value text-ink-subtle', className)}
    >
      {label}
    </p>
  )
}
