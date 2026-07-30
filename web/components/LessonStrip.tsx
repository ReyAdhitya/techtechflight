'use client'

import type { FleetEvent } from '@techtechflight/contract'
import {
  addIncident,
  currentExercise,
  endLesson,
  tallyEvents,
  type LessonRecord,
} from '@/lib/logbook'
import { describeEvent } from '@/lib/telemetry-presentation'
import { LessonBookmarkControl } from './LessonBookmarkControl'
import { LessonIncidentNoteControl } from './LessonIncidentNoteControl'

/**
 * The lesson, while it is running, above everything that needs watching.
 *
 * It lives here rather than on the Lesson screen because a controller does not change
 * position mid-sector. Once a lesson starts, everything a Teacher needs — what needs them,
 * where things are, what each Drone is doing, and the way to finish — is on one screen,
 * and they never have to navigate while six aircraft are up.
 */
export function LessonStrip({
  lesson,
  events,
  now,
}: {
  readonly lesson: LessonRecord
  /** Everything the ground station has recorded, so the close can capture what happened. */
  readonly events: readonly FleetEvent[]
  readonly now: number
}) {
  const elapsed = Math.max(0, now - lesson.startedAt)
  const onNow = currentExercise(lesson, now)
  const sinceStart = events.filter((event) => event.at >= lesson.startedAt)
  const incidents = sinceStart.filter((event) => event.severity !== 'routine')

  return (
    <section className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-surface border border-hairline bg-surface-1 px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="label">Lesson under way</span>
        <span className="font-display text-body font-medium text-ink">{lesson.label}</span>
        <span className="tnum text-value text-ink-subtle">{formatElapsed(elapsed)}</span>
        {onNow && (
          <span className="text-value text-ink">
            Exercise {onNow.position} of {onNow.of}: {onNow.exercise.name}
          </span>
        )}
        {incidents.length > 0 && (
          <span className="tnum text-value text-status-fault">
            {incidents.length} {incidents.length === 1 ? 'incident' : 'incidents'}
          </span>
        )}
      </div>

      <LessonBookmarkControl
        lessonId={lesson.id}
        startedAt={lesson.startedAt}
        now={now}
        bookmarks={lesson.bookmarks ?? []}
      />

      <LessonIncidentNoteControl
        lessonId={lesson.id}
        startedAt={lesson.startedAt}
        now={now}
        incidents={lesson.incidents}
      />

      <button
        type="button"
        /*
         * The same filled treatment "Start the lesson" carries in LessonScreen, character
         * for character. The two are symmetrical halves of one lifecycle and a Teacher has
         * to find the closing half across a room; as a ghost button it read as an aside.
         *
         * Not a Status colour. design.md §9 reserves colour for exception, and a lesson
         * ending on time is the normal path rather than a fault.
         */
        className="min-h-11 cursor-pointer rounded-pill border-0 bg-ink px-5 py-2 text-body font-medium text-canvas"
        onClick={() => {
          const at = now || Date.now()
          /*
           * Written into the record as the lesson closes rather than recomputed later. The
           * ground station's history is bounded, so by next week these events will have
           * aged out of it — and a lesson summary that quietly emptied itself would be
           * worse than no summary at all.
           */
          for (const event of incidents) {
            addIncident(lesson.id, {
              at: event.at,
              text: `${describeEvent(event)}${event.detail ? ` — ${event.detail}` : ''}`,
              severity: event.severity === 'fault' ? 'fault' : 'attention',
              droneId: event.droneId,
              droneName: event.droneName,
            })
          }
          /*
           * The counts go in at the same moment and for the same reason: this is the last
           * point at which the events still exist. Maintenance reads them back so "which
           * Drone keeps giving trouble" survives the ground station being restarted.
           */
          endLesson(lesson.id, at, tallyEvents(sinceStart))
        }}
      >
        End the lesson
      </button>

    </section>
  )
}

export function formatElapsed(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const seconds = Math.floor((ms % 60_000) / 1_000)
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}`
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
