import type { Exercise, LessonRecord } from './logbook'

/**
 * Time left in the Exercise the Lesson is on right now.
 *
 * Walks the same duration ladder as `currentExercise`. Silent (null) when the current
 * Exercise has no duration — an unset length is normal, not incomplete, and inventing a
 * countdown would lie. Silent past the end of the plan for the same reason.
 */

export interface ExerciseRemaining {
  readonly exercise: Exercise
  readonly position: number
  readonly of: number
  /** Milliseconds until this Exercise's planned end. Never negative. */
  readonly remainingMs: number
}

/** Remaining time on the current Exercise, or null when there is nothing honest to say. */
export function exerciseRemaining(
  lesson: LessonRecord,
  now: number,
): ExerciseRemaining | null {
  const exercises = lesson.exercises ?? []
  if (exercises.length === 0) return null

  let elapsed = Math.max(0, now - lesson.startedAt)
  for (const [index, exercise] of exercises.entries()) {
    if (exercise.minutes === undefined) return null
    const length = exercise.minutes * 60_000
    if (elapsed < length) {
      return {
        exercise,
        position: index + 1,
        of: exercises.length,
        remainingMs: length - elapsed,
      }
    }
    elapsed -= length
  }

  return null
}

/**
 * Countdown for a strip: `m:ss left`, or `h:mm left` past an hour.
 *
 * Matches the Lesson elapsed clock's shape so a Teacher scanning strips does not switch
 * formats mid-glance.
 */
export function formatExerciseRemaining(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1_000))
  const hours = Math.floor(totalSeconds / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')} left`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')} left`
}
