'use client'

import { useSyncExternalStore } from 'react'
import {
  currentExercise,
  readLogbook,
  readServerLogbook,
  runningLesson,
  subscribeLogbook,
  type LessonRecord,
} from '@/lib/logbook'

/**
 * Today's objective as one large sentence from the running Lesson.
 *
 * Prefers the Exercise under way (what Students are meant to be doing). Falls back to the
 * Lesson label when the plan has no timed sequence, or when the plan has finished. The
 * wall says nothing invented — if there is no running Lesson, it says so.
 */
export function objectiveSentence(lesson: LessonRecord, now: number): string {
  const onNow = currentExercise(lesson, now)
  if (onNow) return onNow.exercise.name
  return lesson.label
}

export function ObjectiveWall({ now }: { readonly now?: number } = {}) {
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)
  const lesson = runningLesson(book)
  const clock = now ?? Date.now()

  if (!lesson) {
    return (
      <p className="m-0 max-w-prose text-body text-ink-muted">
        No Lesson is running. Start one on the Lesson screen to show today&apos;s objective.
      </p>
    )
  }

  const sentence = objectiveSentence(lesson, clock)

  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Today's objective">
      <p className="label m-0 text-ink-subtle">Today&apos;s objective</p>
      <p className="m-0 max-w-[40rem] font-display text-summary font-medium text-ink">
        {sentence}
      </p>
    </div>
  )
}
