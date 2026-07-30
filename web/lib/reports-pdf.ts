import { jsPDF } from 'jspdf'
import type { LessonRecord } from '@/lib/logbook'
import { formatClock } from '@/lib/telemetry-presentation'

/**
 * Build a Lesson records PDF in the browser (#92).
 *
 * A real file download — not `window.print()` — so the sheet has no browser Headers /
 * footers (URL, clock). Content mirrors what Reports shows: finished Lessons and the
 * recurring-defects ranking the Teacher hands the supplier.
 */

export const REPORTS_PDF_TITLE = 'TechTech Flight - Lesson records'
export const REPORTS_PDF_FILENAME = 'TechTech-Flight-Lesson-records.pdf'

export type ReportsPdfDefect = {
  readonly name: string
  readonly faults: number
  readonly dropouts: number
  readonly flights: number
}

export type ReportsPdfInput = {
  readonly lessons: readonly LessonRecord[]
  readonly defects: readonly ReportsPdfDefect[]
}

function droneName(lesson: LessonRecord, droneId: string): string {
  return (
    lesson.incidents.find((incident) => incident.droneId === droneId)?.droneName ??
    lesson.commands?.find((command) => command.droneId === droneId)?.droneName ??
    droneId
  )
}

export function buildReportsPdfBytes(input: ReportsPdfInput): ArrayBuffer {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 48
  const width = doc.internal.pageSize.getWidth() - margin * 2
  let y = margin

  const ensure = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage()
      y = margin
    }
  }

  const line = (text: string, size = 11, style: 'normal' | 'bold' = 'normal') => {
    ensure(size + 6)
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    const rows = doc.splitTextToSize(text, width) as string[]
    for (const row of rows) {
      ensure(size + 4)
      doc.text(row, margin, y)
      y += size + 4
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(REPORTS_PDF_TITLE, margin, y)
  y += 28

  line('Lessons', 13, 'bold')
  y += 4

  const finished = input.lessons.filter((lesson) => lesson.endedAt !== null).slice(0, 20)
  if (finished.length === 0) {
    line('No Lesson has been completed. A record is written when a Lesson is ended.')
  } else {
    for (const lesson of finished) {
      y += 6
      const when = `${formatClock(lesson.startedAt)}${
        lesson.endedAt ? ` – ${formatClock(lesson.endedAt)}` : ''
      }`
      line(`${lesson.label}  ·  ${when}`, 12, 'bold')
      line(
        `${lesson.readyAtStart} of ${lesson.fleetSize} ready at the start  ·  ${
          lesson.incidents.length === 0
            ? 'No incidents'
            : `${lesson.incidents.length} ${
                lesson.incidents.length === 1 ? 'incident' : 'incidents'
              }`
        }`,
      )
      if (lesson.exercises && lesson.exercises.length > 0) {
        line(`Exercises: ${lesson.exercises.map((exercise) => exercise.name).join(' · ')}`)
      }
      if (lesson.assignments && Object.keys(lesson.assignments).length > 0) {
        line(
          `Flown by: ${Object.entries(lesson.assignments)
            .map(([droneId, student]) => `${student} (${droneName(lesson, droneId)})`)
            .join(', ')}`,
        )
      }
      for (const incident of lesson.incidents) {
        line(`${formatClock(incident.at)}  ${incident.text}`)
      }
      if (lesson.tally && Object.keys(lesson.tally).length > 0) {
        line(
          `Counted: ${Object.entries(lesson.tally)
            .map(
              ([droneId, tally]) =>
                `${droneName(lesson, droneId)}: ${tally.flights} flights, ${tally.faults} faults, ${tally.dropouts} dropouts`,
            )
            .join(' · ')}`,
        )
      }
      if (lesson.commands && lesson.commands.length > 0) {
        line(
          `Asked for: ${lesson.commands
            .map((entry) => `${entry.droneName} — ${entry.kind}`)
            .join(' · ')}`,
        )
      }
    }
  }

  y += 16
  line('Recurring defects by Drone', 13, 'bold')
  y += 4
  if (input.defects.length === 0) {
    line('No Fleet on this board to rank yet.')
  } else {
    for (const entry of input.defects) {
      line(
        `${entry.name}  ·  ${entry.faults} ${entry.faults === 1 ? 'fault' : 'faults'}  ·  ${entry.dropouts} ${entry.dropouts === 1 ? 'dropout' : 'dropouts'}  ·  ${entry.flights} ${entry.flights === 1 ? 'flight' : 'flights'}`,
      )
    }
  }

  return doc.output('arraybuffer') as ArrayBuffer
}

/** Trigger a file download of the reports PDF in the browser. */
export function downloadReportsPdf(input: ReportsPdfInput): void {
  const buffer = buildReportsPdfBytes(input)
  const blob = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = REPORTS_PDF_FILENAME
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
