import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { recordsPath } from './records-db.ts'

/**
 * The browser-shaped Logbook, as a file beside `records.db`.
 *
 * The eighteen tables are what a Lesson leaves behind. This file is how the board gets them
 * back after someone clears browsing data: it is the same JSON the browser already holds, so
 * hydrating is a replace rather than a reconstruction, and a reconstruction from the tables
 * would drop notes, service decisions and everything else the schema does not name.
 *
 * **The file wins when they disagree** (ADR-0035). Ties go to the file, the same way the
 * classroom merge ties go to the store: it is the copy a technician can back up.
 *
 * Written at Lesson boundaries, never per telemetry tick.
 */

export function logbookFilePath(records = recordsPath()): string {
  return join(dirname(records), 'logbook.json')
}

export interface StoredLogbookFile {
  readonly updatedAt: number
  readonly book: unknown
}

export function writeLogbookFile(
  snapshot: StoredLogbookFile,
  path = logbookFilePath(),
): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(snapshot)}\n`, 'utf8')
}

export function readLogbookFile(path = logbookFilePath()): StoredLogbookFile | null {
  if (!existsSync(path)) return null
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const row = parsed as { updatedAt?: unknown; book?: unknown }
    if (typeof row.updatedAt !== 'number' || row.book === undefined) return null
    return { updatedAt: row.updatedAt, book: row.book }
  } catch {
    return null
  }
}
