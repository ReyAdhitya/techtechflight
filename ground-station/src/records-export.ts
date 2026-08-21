import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import { openRecords, recordsPath } from './records-db.ts'

/**
 * The two things a Teacher can do with their records, and neither mentions a file path.
 *
 * A school protects what it cares about by copying it somewhere, so **Save a copy** puts a
 * dated file on the Desktop for a USB stick or the shared drive. **Export for a spreadsheet**
 * writes CSV, because the thing a school actually does with a register is open it in Excel.
 *
 * No Teacher is ever told where `records.db` lives. They press a button and a file appears
 * somewhere they can see it.
 */

const two = (value: number) => String(value).padStart(2, '0')

/** `2026-08-18`, in the school's own day rather than an instant. */
function today(at = new Date()): string {
  return `${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())}`
}

function desktop(home = homedir()): string {
  return join(home, 'Desktop')
}

/**
 * A dated copy of the whole records file, on the Desktop.
 *
 * The file rather than an export, because this is the copy that can be opened again by this
 * product. Dated rather than overwritten: a Teacher who presses it twice in a term wants two
 * copies, and a backup that silently replaces the last one is not a backup.
 */
export function saveRecordsCopy(
  options: { readonly from?: string; readonly to?: string; readonly at?: Date } = {},
): string {
  const from = options.from ?? recordsPath()
  const folder = options.to ?? desktop()
  mkdirSync(folder, { recursive: true })
  const destination = join(folder, `TechTech Flight records ${today(options.at)}.db`)
  copyFileSync(from, destination)
  return destination
}

/** One cell, quoted only when it has to be. Excel is the reader, not a parser we control. */
function cell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * The register, as a spreadsheet.
 *
 * One row per child per Lesson, which is the shape a school already reads: who, when, which
 * craft, and how many points. Not the eighteen tables — a Teacher opening a spreadsheet wants
 * a register, and eighteen sheets of foreign keys is not one.
 *
 * **No live readings**, for the same reason they are not in the file: this is what happened.
 */
export function recordsCsv(db: DatabaseSync): string {
  const rows = db
    .prepare(
      `select
         l.label          as lesson,
         l.started_at     as started,
         c.name           as class,
         s.name           as student,
         d.label          as drone,
         t.name           as team,
         (select count(*) from checkpoint_reached cr where cr.flight_id = f.id) as points
       from lesson l
       join class_group c on c.id = l.class_id
       left join mission m on m.lesson_id = l.id
       left join flight f on f.mission_id = m.id
       left join team t on t.id = f.team_id
       left join drone d on d.id = f.drone_id
       left join team_member tm on tm.team_id = t.id
       left join student s on s.id = tm.student_id
       order by l.started_at desc, s.name`,
    )
    .all() as Record<string, unknown>[]

  const header = ['Lesson', 'Started', 'Class', 'Student', 'Drone', 'Team', 'Points reached']
  const lines = [header.join(',')]
  for (const row of rows) {
    lines.push(
      [row['lesson'], row['started'], row['class'], row['student'], row['drone'], row['team'], row['points']]
        .map(cell)
        .join(','),
    )
  }
  return `${lines.join('\n')}\n`
}

/** Write the spreadsheet to the Desktop and hand back where it went. */
export function exportRecordsCsv(
  options: { readonly to?: string; readonly at?: Date; readonly db?: DatabaseSync } = {},
): string {
  const folder = options.to ?? desktop()
  mkdirSync(folder, { recursive: true })
  const destination = join(folder, `TechTech Flight records ${today(options.at)}.csv`)

  if (options.db) {
    writeFileSync(destination, recordsCsv(options.db), 'utf8')
    return destination
  }
  const records = openRecords()
  try {
    writeFileSync(destination, recordsCsv(records.db), 'utf8')
  } finally {
    records.close()
  }
  return destination
}
