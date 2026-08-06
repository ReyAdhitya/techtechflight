'use client'

import { useSyncExternalStore } from 'react'
import {
  readLogbook,
  readServerLogbook,
  subscribeLogbook,
  type LessonRecord,
} from '@/lib/logbook'
import { formatClock } from '@/lib/telemetry-presentation'
import { cn } from '@/lib/utils'

/**
 * Every Lesson that has finished.
 *
 * Read from the record written as each one closed rather than recomputed from the ground
 * station, because the ground station's history is bounded and by next week those events
 * are gone. A summary that quietly emptied itself would be worse than no summary.
 */
/**
 * The Drone Name as it was, not as it is.
 *
 * Read from the incidents captured when the Lesson closed, which carry the name
 * denormalised for exactly this reason: a report read next term has to stay readable
 * after that Drone has gone back to the supplier.
 */
function droneName(lesson: LessonRecord, droneId: string): string {
  return (
    lesson.incidents.find((incident) => incident.droneId === droneId)?.droneName ??
    lesson.commands?.find((command) => command.droneId === droneId)?.droneName ??
    droneId
  )
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="m-0 flex flex-wrap gap-x-2 text-value text-ink-subtle">
      <span className="label">{label}</span>
      <span>{children}</span>
    </p>
  )
}

export function LessonReports() {
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)
  const finished = book.lessons.filter((lesson) => lesson.endedAt !== null)

  return (
    <section className="flex flex-col gap-3">
      <h2 className="label m-0">Lessons</h2>

      {finished.length === 0 ? (
        <p className="m-0 text-value text-ink-subtle">
          No Lesson has been completed. A record is written when a Lesson is ended.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {finished.slice(0, 20).map((lesson) => (
            <li
              key={lesson.id}
              className="lesson-report flex flex-col gap-2 rounded-surface border border-hairline bg-surface-1 p-4"
            >
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="font-display text-body font-medium text-ink">{lesson.label}</span>
                <span className="tnum text-value text-ink-subtle">
                  {formatClock(lesson.startedAt)}
                  {lesson.endedAt && ` to ${formatClock(lesson.endedAt)}`}
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
                <Line label="Exercises">
                  {lesson.exercises.map((exercise) => exercise.name).join(', ')}
                </Line>
              )}

              {lesson.assignments && Object.keys(lesson.assignments).length > 0 && (
                <Line label="Flown by">
                  {Object.entries(lesson.assignments)
                    .map(([droneId, student]) => `${student} (${droneName(lesson, droneId)})`)
                    .join(', ')}
                </Line>
              )}

              {lesson.incidents.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="label">What went wrong</span>
                  <ul className="m-0 flex list-none flex-col gap-1 p-0">
                    {lesson.incidents.map((incident, index) => (
                      <li
                        key={`${incident.at}-${index}`}
                        className={cn(
                          'text-value',
                          incident.severity === 'fault' ? 'text-status-fault' : 'text-ink',
                        )}
                      >
                        <span className="tnum text-ink-muted">{formatClock(incident.at)}</span>{' '}
                        {incident.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {lesson.tally && Object.keys(lesson.tally).length > 0 && (
                <Line label="Counted">
                  {Object.entries(lesson.tally)
                    .map(
                      ([droneId, tally]) =>
                        `${droneName(lesson, droneId)}: ${tally.flights} flights, ${tally.faults} faults, ${tally.dropouts} dropouts`,
                    )
                    .join(', ')}
                </Line>
              )}

              {lesson.commands && lesson.commands.length > 0 && (
                <Line label="Asked for">
                  {lesson.commands
                    .map((entry) => `${entry.droneName}, ${entry.kind}`)
                    .join(', ')}
                </Line>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
