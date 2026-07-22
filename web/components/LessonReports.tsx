'use client'

import { useSyncExternalStore } from 'react'
import { readLogbook, readServerLogbook, subscribeLogbook } from '@/lib/logbook'
import { formatClock } from '@/lib/telemetry-presentation'
import { cn } from '@/lib/utils'

/**
 * Every Lesson that has finished.
 *
 * Read from the record written as each one closed rather than recomputed from the ground
 * station, because the ground station's history is bounded and by next week those events
 * are gone. A summary that quietly emptied itself would be worse than no summary.
 */
export function LessonReports() {
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)
  const finished = book.lessons.filter((lesson) => lesson.endedAt !== null)

  return (
    <section className="flex flex-col gap-3">
      <h2 className="label m-0">Lessons</h2>

      {finished.length === 0 ? (
        <p className="m-0 text-value text-ink-subtle">
          None finished yet. A Lesson writes its record when you end it.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {finished.slice(0, 20).map((lesson) => (
            <li
              key={lesson.id}
              className="flex flex-col gap-2 rounded-surface border border-hairline bg-surface-1 p-4"
            >
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="font-display text-body font-medium text-ink">{lesson.label}</span>
                <span className="tnum text-value text-ink-subtle">
                  {formatClock(lesson.startedAt)}
                  {lesson.endedAt && ` – ${formatClock(lesson.endedAt)}`}
                </span>
                <span className="tnum text-value text-ink-muted">
                  {lesson.readyAtStart} of {lesson.fleetSize} ready at the start
                </span>
                <span
                  className={cn(
                    'tnum ml-auto text-value',
                    lesson.incidents.length > 0 ? 'text-status-fault' : 'text-ink-subtle',
                  )}
                >
                  {lesson.incidents.length === 0
                    ? 'No incidents'
                    : `${lesson.incidents.length} ${
                        lesson.incidents.length === 1 ? 'incident' : 'incidents'
                      }`}
                </span>
              </div>

              {lesson.exercises && lesson.exercises.length > 0 && (
                <p className="m-0 text-value text-ink-subtle">
                  {lesson.exercises.map((exercise) => exercise.name).join(' · ')}
                </p>
              )}

              {lesson.assignments && Object.keys(lesson.assignments).length > 0 && (
                <p className="m-0 text-value text-ink-subtle">
                  {Object.values(lesson.assignments).join(', ')}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
