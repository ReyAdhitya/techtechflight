'use client'

import type { LessonRecord } from '@/lib/logbook'
import { formatClock } from '@/lib/telemetry-presentation'

/**
 * One-page printable Lesson summary (#314 / F195).
 *
 * Relies on the board's global `@media print` paper-token reset (see globals.css —
 * "Printing a Lesson report.") and adds a scoped rule so this article stays on one
 * A4 page. Unmounted until the Integrator wires it from Reports.
 */

export const LESSON_ONE_PAGER_PRINT_CSS = `
@media print {
  .lesson-one-pager {
    break-inside: avoid;
    page-break-inside: avoid;
    color: #1b1815;
    background: #ffffff;
  }

  .lesson-one-pager,
  .lesson-one-pager * {
    color-scheme: light;
  }
}
`.trim()

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

export function LessonOnePager({
  lesson,
}: {
  readonly lesson: LessonRecord
}) {
  const when = `${formatClock(lesson.startedAt)}${
    lesson.endedAt ? ` to ${formatClock(lesson.endedAt)}` : ''
  }`

  return (
    <article
      className="lesson-one-pager flex flex-col gap-3 rounded-surface border border-hairline bg-surface-1 p-4 text-ink"
      aria-label={`Lesson summary: ${lesson.label}`}
    >
      <style>{LESSON_ONE_PAGER_PRINT_CSS}</style>

      <header className="flex flex-col gap-1 border-b border-hairline pb-3">
        <p className="m-0 font-display text-heading font-medium">{lesson.label}</p>
        <p className="m-0 tnum text-value text-ink-subtle">{when}</p>
        <p className="m-0 tnum text-value text-ink-muted">
          {lesson.readyAtStart} of {lesson.fleetSize} ready at the start
        </p>
      </header>

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

      <div className="flex flex-col gap-1">
        <span className="label">Incidents</span>
        {lesson.incidents.length === 0 ? (
          <p className="m-0 text-value text-ink-subtle">No incidents</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {lesson.incidents.slice(0, 12).map((incident, index) => (
              <li key={`${incident.at}-${index}`} className="text-value text-ink">
                <span className="tnum text-ink-muted">{formatClock(incident.at)}</span>{' '}
                {incident.text}
                {incident.droneName ? ` (${incident.droneName})` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>

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
    </article>
  )
}
