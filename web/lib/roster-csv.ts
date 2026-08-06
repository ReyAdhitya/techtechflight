import { saveRoll, upsertStudent } from '@/lib/logbook'

/**
 * Roster CSV import — validate before writing (#345 / F226).
 *
 * A malformed file must change nothing and say why. Parsing is pure; only
 * `applyRosterCsv` touches the Logbook, and only after validation succeeds.
 *
 * Accepted shapes:
 * - header `name` with optional `studentId` / `id` column
 * - headerless one-name-per-line
 */

export type RosterCsvRow = {
  readonly name: string
  readonly studentId?: string
}

export type RosterCsvOk = {
  readonly ok: true
  readonly rows: readonly RosterCsvRow[]
}

export type RosterCsvErr = {
  readonly ok: false
  readonly reason: string
}

export type RosterCsvResult = RosterCsvOk | RosterCsvErr

/** Split one CSV line into fields, honouring double-quoted cells. */
export function splitCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === ',') {
      fields.push(current)
      current = ''
      continue
    }
    current += ch
  }
  fields.push(current)
  return fields.map((field) => field.trim())
}

function isHeaderRow(fields: readonly string[]): boolean {
  const lower = fields.map((field) => field.toLowerCase())
  return lower.includes('name') || lower.includes('studentid') || lower.includes('id')
}

/**
 * Parse and validate a roster CSV without writing.
 *
 * Failures name the problem in Teacher words. Duplicate names (or ids) in the
 * file are an error — fix the sheet rather than silently drop rows.
 */
export function parseRosterCsv(text: string): RosterCsvResult {
  if (typeof text !== 'string') {
    return { ok: false, reason: 'That file could not be read as text.' }
  }
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')

  if (lines.length === 0) {
    return { ok: false, reason: 'The file is empty. Add a name column and try again.' }
  }

  const first = splitCsvLine(lines[0]!)
  let start = 0
  let nameIdx = 0
  let idIdx = -1

  if (isHeaderRow(first)) {
    const lower = first.map((field) => field.toLowerCase())
    nameIdx = lower.indexOf('name')
    if (nameIdx < 0) {
      return {
        ok: false,
        reason: 'The header needs a Name column. Add one and try again.',
      }
    }
    idIdx = lower.indexOf('studentid')
    if (idIdx < 0) idIdx = lower.indexOf('id')
    start = 1
    if (lines.length === 1) {
      return {
        ok: false,
        reason: 'The file has a header but no Students. Add a row for each name.',
      }
    }
  } else if (first.length > 1) {
    return {
      ok: false,
      reason:
        'Several columns but no Name header. Put Name (and optional studentId) on the first row.',
    }
  }

  const rows: RosterCsvRow[] = []
  const seenNames = new Set<string>()
  const seenIds = new Set<string>()
  let withId = 0
  let withoutId = 0

  for (let i = start; i < lines.length; i += 1) {
    const fields = splitCsvLine(lines[i]!)
    const name = (fields[nameIdx] ?? '').trim()
    if (name === '') {
      return {
        ok: false,
        reason: `Row ${i + 1} has no name. Fill every name cell, or remove the empty row.`,
      }
    }
    const nameKey = name.toLowerCase()
    if (seenNames.has(nameKey)) {
      return {
        ok: false,
        reason: `The name "${name}" appears twice. Fix the duplicate and try again.`,
      }
    }
    seenNames.add(nameKey)

    let studentId: string | undefined
    if (idIdx >= 0) {
      const rawId = (fields[idIdx] ?? '').trim()
      if (rawId !== '') {
        if (seenIds.has(rawId)) {
          return {
            ok: false,
            reason: `The studentId "${rawId}" appears twice. Fix the duplicate and try again.`,
          }
        }
        seenIds.add(rawId)
        studentId = rawId
        withId += 1
      } else {
        withoutId += 1
      }
    }

    rows.push(studentId !== undefined ? { name, studentId } : { name })
  }

  if (rows.length === 0) {
    return { ok: false, reason: 'No Students found in that file.' }
  }

  if (idIdx >= 0 && withId > 0 && withoutId > 0) {
    return {
      ok: false,
      reason:
        'Some rows have a studentId and some do not. Give every row an id, or leave the id column empty for all.',
    }
  }

  return { ok: true, rows }
}

/**
 * Validate, then write. On failure the Logbook is untouched and `reason` says why.
 *
 * Name-only files replace the class list via `saveRoll`. Files with studentId
 * upsert each row and leave other roster members alone.
 */
export function applyRosterCsv(text: string): RosterCsvResult {
  const parsed = parseRosterCsv(text)
  if (!parsed.ok) return parsed

  const withIds = parsed.rows.filter((row) => row.studentId !== undefined)
  if (withIds.length > 0) {
    for (const row of withIds) {
      upsertStudent(row.studentId!, row.name)
    }
    return parsed
  }

  saveRoll(parsed.rows.map((row) => row.name))
  return parsed
}
