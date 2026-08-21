import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openRecords, recordsPath, tableNames, type RecordsDb } from './records-db.ts'

/**
 * The records, as a file on the laptop (ADR-0035).
 *
 * The two things worth pinning are the two a school would notice. The eighteen tables have to
 * actually arrive, because a file with fifteen of them fails at the moment a Teacher seals a
 * Mission. And the file has to live outside the app folder, because an update is a replaced
 * folder and a term of attendance must not go with it.
 */

let dir: string
let records: RecordsDb | null = null

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ttf-records-'))
})

afterEach(() => {
  records?.close()
  records = null
  rmSync(dir, { recursive: true, force: true })
})

describe('opening the records file', () => {
  it('creates the folder and the file the first time', () => {
    records = openRecords(join(dir, 'TechTech Flight', 'records.db'))

    expect(records.path).toContain('records.db')
    expect(tableNames(records.db).length).toBeGreaterThan(0)
  })

  it('carries every table in db/schema.sql', () => {
    records = openRecords(join(dir, 'records.db'))

    const tables = tableNames(records.db)
    for (const table of [
      'school',
      'teacher',
      'class_group',
      'student',
      'drone',
      'scenario',
      'criterion',
      'lesson',
      'mission',
      'team',
      'team_member',
      'zone',
      'zone_point',
      'checkpoint',
      'flight',
      'checkpoint_reached',
      'incident',
      'criterion_result',
    ]) {
      expect(tables, `${table} is missing from the records file`).toContain(table)
    }
  })

  /* A laptop that has run a hundred lessons and one that has never been opened take the same
     path. First run must not fail differently on a machine that has never seen this. */
  it('opens an existing file without complaining', () => {
    const path = join(dir, 'records.db')
    openRecords(path).close()
    records = openRecords(path)

    expect(tableNames(records.db)).toContain('lesson')
  })

  it('holds a row, and gives it back', () => {
    records = openRecords(join(dir, 'records.db'))

    records.db.prepare('insert into school (id, name) values (?, ?)').run('s-1', 'Test Primary')
    const row = records.db.prepare('select name from school where id = ?').get('s-1') as {
      name: string
    }

    expect(row.name).toBe('Test Primary')
  })

  /* The three awkward tables are the reason the schema is normalised; they must take rows. */
  it('takes a zone with corners in order', () => {
    records = openRecords(join(dir, 'records.db'))
    const { db } = records

    db.prepare('insert into school (id, name) values (?, ?)').run('s-1', 'Test')
    db.prepare('insert into class_group (id, school_id, name) values (?, ?, ?)').run(
      'c-1',
      's-1',
      'Year 8',
    )
    db.prepare('insert into teacher (id, school_id, name) values (?, ?, ?)').run('t-1', 's-1', 'A')
    db.prepare(
      'insert into lesson (id, class_id, teacher_id, label, started_at) values (?, ?, ?, ?, ?)',
    ).run('l-1', 'c-1', 't-1', 'Year 8, period 3', '2026-08-18T09:00:00Z')
    db.prepare('insert into scenario (id, name, objective, limit_minutes) values (?, ?, ?, ?)').run(
      'sc-1',
      'Search and Rescue',
      'Find the target',
      12,
    )
    db.prepare(
      'insert into mission (id, lesson_id, scenario_id, started_at) values (?, ?, ?, ?)',
    ).run('m-1', 'l-1', 'sc-1', '2026-08-18T09:05:00Z')
    db.prepare('insert into zone (id, mission_id, kind, name) values (?, ?, ?, ?)').run(
      'z-1',
      'm-1',
      'no-fly',
      'Over the desks',
    )

    const corner = db.prepare(
      'insert into zone_point (id, zone_id, ordinal, east_m, north_m) values (?, ?, ?, ?, ?)',
    )
    corner.run('p-1', 'z-1', 0, -3, -2)
    corner.run('p-2', 'z-1', 1, 3, -2)
    corner.run('p-3', 'z-1', 2, 3, 2)

    const points = db
      .prepare('select ordinal, east_m from zone_point where zone_id = ? order by ordinal')
      .all('z-1') as { ordinal: number; east_m: number }[]

    expect(points.map((p) => p.ordinal)).toEqual([0, 1, 2])
    expect(points[0]?.east_m).toBe(-3)
  })

  /* A zone whose corners came back in a different order is a different shape. */
  it('refuses two corners claiming the same place in the order', () => {
    records = openRecords(join(dir, 'records.db'))
    const { db } = records

    db.prepare('insert into school (id, name) values (?, ?)').run('s-1', 'Test')
    db.prepare('insert into class_group (id, school_id, name) values (?, ?, ?)').run('c-1', 's-1', 'Y')
    db.prepare('insert into teacher (id, school_id, name) values (?, ?, ?)').run('t-1', 's-1', 'A')
    db.prepare(
      'insert into lesson (id, class_id, teacher_id, label, started_at) values (?, ?, ?, ?, ?)',
    ).run('l-1', 'c-1', 't-1', 'L', '2026-08-18T09:00:00Z')
    db.prepare('insert into scenario (id, name, objective, limit_minutes) values (?, ?, ?, ?)').run(
      'sc-1',
      'S',
      'O',
      12,
    )
    db.prepare('insert into mission (id, lesson_id, scenario_id, started_at) values (?, ?, ?, ?)').run(
      'm-1',
      'l-1',
      'sc-1',
      '2026-08-18T09:05:00Z',
    )
    db.prepare('insert into zone (id, mission_id, kind, name) values (?, ?, ?, ?)').run(
      'z-1',
      'm-1',
      'no-fly',
      'Z',
    )
    const corner = db.prepare(
      'insert into zone_point (id, zone_id, ordinal, east_m, north_m) values (?, ?, ?, ?, ?)',
    )
    corner.run('p-1', 'z-1', 0, 1, 1)

    expect(() => corner.run('p-2', 'z-1', 0, 2, 2)).toThrow()
  })
})

/**
 * The file lives outside the app folder, and that is the whole reason it is in Documents.
 *
 * An update is a replaced folder. Anything inside the app folder is destroyed by one, and a
 * term of attendance must not depend on somebody remembering to copy it out first.
 */
describe('where the file lives', () => {
  it('is in Documents on Windows, under a folder a school recognises', () => {
    const path = recordsPath('C:\\Users\\teacher')

    if (process.platform === 'win32') {
      expect(path).toContain('Documents')
    }
    expect(path).toContain('TechTech Flight')
    expect(path.endsWith('records.db')).toBe(true)
  })

  it('is never inside the app folder', () => {
    expect(recordsPath()).not.toContain('ground-station')
    expect(recordsPath()).not.toContain('node_modules')
  })
})
