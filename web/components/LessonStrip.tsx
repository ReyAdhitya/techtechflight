'use client'

import type { FleetEvent } from '@techtechflight/contract'
import { useState } from 'react'
import {
  addIncident,
  currentExercise,
  endLesson,
  exportLogbook,
  recordsAreHeavy,
  readLogbook,
  tallyEvents,
  type LessonRecord,
} from '@/lib/logbook'
import { describeEvent } from '@/lib/telemetry-presentation'

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
  const [justEnded, setJustEnded] = useState(false)
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

      <button
        type="button"
        className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
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
          // Offered rather than done. Whether a record leaves this browser is the
          // Teacher's decision, and a download nobody asked for is a download nobody
          // trusts.
          setJustEnded(recordsAreHeavy(readLogbook()))
        }}
      >
        End the lesson
      </button>

      {justEnded && (
        <p className="m-0 flex flex-wrap items-center gap-3 text-value text-ink-subtle" role="status">
          Your records are getting large for a browser to hold.
          <button
            type="button"
            onClick={() => {
              exportLogbook()
              setJustEnded(false)
            }}
            className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
          >
            Export them now
          </button>
        </p>
      )}
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
