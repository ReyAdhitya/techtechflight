'use client'

import type { LessonIncident, LessonRecord } from '@/lib/logbook'
import { missionsFrom } from '@/lib/logbook'
import { alertLogForLesson, type AlertLogRecord } from '@/lib/alert-log'
import {
  INCIDENT_CATEGORIES,
  labelIncidentCategory,
} from '@/lib/incident-categories'
import { playbookFor } from '@/lib/incident-playbook'
import {
  CRITERION_WORDS,
  FAILURE_WORDS,
  type Mission,
} from '@/lib/mission'
import { scenarioOrUnknown } from '@/lib/mission-scenarios'
import { formatClock } from '@/lib/telemetry-presentation'
import { cn } from '@/lib/utils'

/**
 * Mission log, score breakdown and debrief for one closed Lesson (#552 / F388).
 *
 * Read from the Logbook record and the alert log — not recomputed from live Telemetry.
 * Print-friendly via scoped paper tokens (see `MISSION_REPORT_PRINT_CSS`).
 */

export const MISSION_REPORT_PRINT_CSS = `
@media print {
  .mission-report {
    break-inside: avoid;
    page-break-inside: avoid;
    color: #1b1815;
    background: #ffffff;
  }

  .mission-report,
  .mission-report * {
    color-scheme: light;
  }
}
`.trim()

/** Parse the fixed category prefix from a stored Teacher note, if present. */
export function categoryFromIncidentText(text: string): string {
  for (const entry of INCIDENT_CATEGORIES) {
    const prefix = `${entry.label}: `
    if (text.startsWith(prefix)) return entry.label
  }
  return labelIncidentCategory(null)
}

/** The note body after the category prefix, or the full text when uncategorised. */
export function incidentNoteBody(text: string): string {
  for (const entry of INCIDENT_CATEGORIES) {
    const prefix = `${entry.label}: `
    if (text.startsWith(prefix)) return text.slice(prefix.length)
  }
  return text
}

export interface IncidentCategoryGroup {
  readonly category: string
  readonly incidents: readonly LessonIncident[]
}

export interface AlertCategoryGroup {
  readonly category: string
  readonly alerts: readonly AlertLogRecord[]
}

/** Teacher incidents grouped by their fixed category vocabulary. */
export function groupIncidentsByCategory(
  incidents: readonly LessonIncident[],
): readonly IncidentCategoryGroup[] {
  const buckets = new Map<string, LessonIncident[]>()

  for (const incident of incidents) {
    const category = categoryFromIncidentText(incident.text)
    const list = buckets.get(category) ?? []
    list.push(incident)
    buckets.set(category, list)
  }

  const ordered = [
    ...INCIDENT_CATEGORIES.map((entry) => entry.label),
    labelIncidentCategory(null),
  ]

  return ordered
    .filter((category) => buckets.has(category))
    .map((category) => ({ category, incidents: buckets.get(category)! }))
}

/** Alert log rows grouped by playbook title — stable order, no reshuffle on re-render. */
export function groupAlertsByCategory(
  records: readonly AlertLogRecord[],
): readonly AlertCategoryGroup[] {
  const buckets = new Map<string, AlertLogRecord[]>()

  for (const record of records) {
    const category = playbookFor(record.kind)?.title ?? record.kind
    const list = buckets.get(category) ?? []
    list.push(record)
    buckets.set(category, list)
  }

  return [...buckets.entries()].map(([category, alerts]) => ({ category, alerts }))
}

function criterionStatus(met: boolean | null): { label: string; className: string } {
  if (met === true) return { label: 'Met', className: 'text-ink' }
  if (met === false) return { label: 'Not met', className: 'text-status-fault' }
  return { label: 'Unknown', className: 'text-ink-muted' }
}

function MissionScoreBreakdown({ mission }: { readonly mission: Mission }) {
  const scenario = scenarioOrUnknown(mission.scenarioId)
  const outcome = mission.outcome

  if (outcome === null) {
    return (
      <p className="m-0 text-value text-ink-subtle">Mission not sealed. No score recorded.</p>
    )
  }

  const judged = scenario.judges

  return (
    <div className="flex flex-col gap-2">
      {outcome.score !== null ? (
        <p className="m-0 text-value text-ink">
          <span className="label">Score</span>{' '}
          <span className="tnum font-medium">{Math.round(outcome.score * 100)}</span>%
        </p>
      ) : (
        <p className="m-0 text-value text-ink-subtle">Score not recorded. Too little measured.</p>
      )}

      {judged.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="label">Criteria</span>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {judged.map((criterion) => {
              const status = criterionStatus(outcome.criteria[criterion])
              return (
                <li
                  key={criterion}
                  className={cn('flex flex-wrap items-baseline gap-x-2 text-value', status.className)}
                >
                  <span>{CRITERION_WORDS[criterion]}</span>
                  <span className="label">{status.label}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {outcome.failures.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="label">Failure conditions</span>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {outcome.failures.map((failure) => (
              <li key={failure} className="text-value text-status-fault">
                {FAILURE_WORDS[failure]}
              </li>
            ))}
          </ul>
        </div>
      )}

      {outcome.debrief !== null && outcome.debrief !== '' && (
        <p className="m-0 text-value text-ink-subtle">
          <span className="label">Debrief</span> {outcome.debrief}
        </p>
      )}
    </div>
  )
}

function MissionLogEntry({ mission }: { readonly mission: Mission }) {
  const scenario = scenarioOrUnknown(mission.scenarioId)

  return (
    <section className="flex flex-col gap-2 border-t border-hairline pt-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-body font-medium text-ink">{mission.name}</span>
        <span className="text-value text-ink-subtle">{scenario.name}</span>
        {mission.startedAt !== null && (
          <span className="tnum text-value text-ink-muted">
            {formatClock(mission.startedAt)}
            {mission.outcome?.endedAt !== undefined && mission.outcome?.endedAt !== null
              ? ` to ${formatClock(mission.outcome.endedAt)}`
              : ''}
          </span>
        )}
      </div>

      {scenario.successCriteria.length > 0 && (
        <p className="m-0 text-value text-ink-subtle">
          <span className="label">Stated criteria</span>{' '}
          {scenario.successCriteria.join(', ')}
        </p>
      )}

      <MissionScoreBreakdown mission={mission} />
    </section>
  )
}

function IncidentsByCategory({
  incidents,
  alerts,
}: {
  readonly incidents: readonly LessonIncident[]
  readonly alerts: readonly AlertLogRecord[]
}) {
  const incidentGroups = groupIncidentsByCategory(incidents)
  const alertGroups = groupAlertsByCategory(alerts)

  if (incidentGroups.length === 0 && alertGroups.length === 0) {
    return <p className="m-0 text-value text-ink-subtle">No incidents recorded.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {incidentGroups.map((group) => (
        <div key={group.category} className="flex flex-col gap-1">
          <span className="label">{group.category}</span>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {group.incidents.map((incident, index) => (
              <li key={`${incident.at}-${index}`} className="text-value text-ink">
                <span className="tnum text-ink-muted">{formatClock(incident.at)}</span>{' '}
                {incidentNoteBody(incident.text)}
                {incident.droneName ? ` (${incident.droneName})` : ''}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {alertGroups.map((group) => (
        <div key={group.category} className="flex flex-col gap-1">
          <span className="label">{group.category}</span>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {group.alerts.map((alert) => (
              <li key={alert.id} className="text-value text-ink-subtle">
                <span className="font-medium text-ink">{alert.droneName}</span>
                {', '}
                {alert.text}
                {alert.teacherAction ? `, Action: ${alert.teacherAction}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function MissionReport({ lesson }: { readonly lesson: LessonRecord }) {
  const missions = missionsFrom(lesson)
  if (missions.length === 0) return null

  const alerts = alertLogForLesson(lesson.id)
  const when = `${formatClock(lesson.startedAt)}${
    lesson.endedAt ? ` to ${formatClock(lesson.endedAt)}` : ''
  }`

  return (
    <article
      className="mission-report flex flex-col gap-4 rounded-surface border border-hairline bg-surface-1 p-4 text-ink"
      aria-label={`Mission report: ${lesson.label}`}
    >
      <style>{MISSION_REPORT_PRINT_CSS}</style>

      <header className="flex flex-col gap-1 border-b border-hairline pb-3">
        <p className="m-0 font-display text-body font-medium">{lesson.label}</p>
        <p className="m-0 tnum text-value text-ink-subtle">{when}</p>
      </header>

      <div className="flex flex-col gap-4">
        <h3 className="label m-0">Mission log</h3>
        {missions.map((mission) => (
          <MissionLogEntry key={mission.id} mission={mission} />
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-hairline pt-3">
        <h3 className="label m-0">Incidents by category</h3>
        <IncidentsByCategory incidents={lesson.incidents} alerts={alerts} />
      </div>
    </article>
  )
}