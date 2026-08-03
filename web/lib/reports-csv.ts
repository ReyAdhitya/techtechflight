import type { LessonRecord } from '@/lib/logbook'
import { formatClock } from '@/lib/telemetry-presentation'

/**
 * Build a Lesson / incident CSV a spreadsheet opens cleanly (#308 / F189).
 *
 * RFC 4180 quoting: names with commas, quotes, or newlines wrap in double quotes and
 * internal quotes double. Two tables in one file — Lessons, then Incidents — so Excel and
 * LibreOffice still open a single download without a second sheet.
 */

export const REPORTS_CSV_FILENAME = 'TechTech-Flight-Lesson-records.csv'

export type ReportsCsvInput = {
  readonly lessons: readonly LessonRecord[]
}

/** Quote a field when a spreadsheet would otherwise split or misread it. */
export function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function row(fields: readonly string[]): string {
  return fields.map(escapeCsvField).join(',')
}

function droneName(lesson: LessonRecord, droneId: string): string {
  return (
    lesson.incidents.find((incident) => incident.droneId === droneId)?.droneName ??
    lesson.commands?.find((command) => command.droneId === droneId)?.droneName ??
    droneId
  )
}

function flownBy(lesson: LessonRecord): string {
  if (!lesson.assignments || Object.keys(lesson.assignments).length === 0) return ''
  return Object.entries(lesson.assignments)
    .map(([droneId, student]) => `${student} (${droneName(lesson, droneId)})`)
    .join('; ')
}

/**
 * Serialise finished Lessons and every incident under them.
 *
 * Open Lessons are omitted — the report is what closed, matching Reports PDF.
 */
export function buildReportsCsv(input: ReportsCsvInput): string {
  const finished = input.lessons.filter((lesson) => lesson.endedAt !== null)
  const lines: string[] = []

  lines.push(row(['Lesson', 'Started', 'Ended', 'Ready at start', 'Fleet size', 'Incidents', 'Flown by']))
  if (finished.length === 0) {
    lines.push(row(['No Lesson has been completed', '', '', '', '', '', '']))
  } else {
    for (const lesson of finished) {
      lines.push(
        row([
          lesson.label,
          formatClock(lesson.startedAt),
          lesson.endedAt ? formatClock(lesson.endedAt) : '',
          String(lesson.readyAtStart),
          String(lesson.fleetSize),
          String(lesson.incidents.length),
          flownBy(lesson),
        ]),
      )
    }
  }

  lines.push('')
  lines.push(row(['Lesson', 'At', 'Drone', 'Severity', 'Text']))
  let anyIncident = false
  for (const lesson of finished) {
    for (const incident of lesson.incidents) {
      anyIncident = true
      lines.push(
        row([
          lesson.label,
          formatClock(incident.at),
          incident.droneName ?? incident.droneId ?? '',
          incident.severity,
          incident.text,
        ]),
      )
    }
  }
  if (!anyIncident) {
    lines.push(row(['No incidents recorded', '', '', '', '']))
  }

  return `${lines.join('\r\n')}\r\n`
}

/** Trigger a file download of the reports CSV in the browser. */
export function downloadReportsCsv(input: ReportsCsvInput): void {
  const body = buildReportsCsv(input)
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = REPORTS_CSV_FILENAME
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
