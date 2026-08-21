import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openRecords, type RecordsDb } from './records-db.ts'
import { exportRecordsCsv, recordsCsv, saveRecordsCopy } from './records-export.ts'
import { writeLesson, type LessonSnapshot } from './records-writer.ts'

/**
 * The two buttons, and neither tells a Teacher a file path.
 *
 * A school protects what it cares about by copying it somewhere. These are the copy and the
 * spreadsheet, both dated, both landing where a Teacher can see them.
 */

let dir: string
let records: RecordsDb
let dbPath: string

const snapshot: LessonSnapshot = {
  schoolName: 'Test Primary',
  className: 'Year 8',
  teacherName: 'Ms Adeyemi',
  lessonId: 'L-1',
  lessonLabel: 'Year 8, period 3',
  startedAt: '2026-08-18T09:00:00.000Z',
  endedAt: '2026-08-18T09:50:00.000Z',
  demonstration: false,
  scenario: { id: 'sr', name: 'Search and Rescue', objective: 'Find it', limitMinutes: 12 },
  missionId: 'M-1',
  missionStartedAt: '2026-08-18T09:10:00.000Z',
  missionSealedAt: '2026-08-18T09:45:00.000Z',
  drones: [{ id: 'ttf-0001', label: 'Drone 1' }],
  teams: [{ id: 'T-1', name: 'Red Team', studentIds: ['stu-priya'], droneId: 'ttf-0001' }],
  zones: [],
  checkpoints: [{ id: 'C-1', eastM: 1, northM: 1 }],
  seats: [
    {
      studentId: 'stu-priya',
      studentName: 'Priya',
      droneId: 'ttf-0001',
      droneLabel: 'Drone 1',
      present: true,
      tookOffAt: '2026-08-18T09:12:00.000Z',
      landedAt: '2026-08-18T09:40:00.000Z',
      reached: [{ checkpointId: 'C-1', at: '2026-08-18T09:20:00.000Z' }],
    },
  ],
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ttf-export-'))
  dbPath = join(dir, 'records.db')
  records = openRecords(dbPath)
  writeLesson(snapshot, records)
})

afterEach(() => {
  records.close()
  rmSync(dir, { recursive: true, force: true })
})

describe('save a copy of my records', () => {
  it('puts a dated file where a Teacher can find it', () => {
    const saved = saveRecordsCopy({ from: dbPath, to: dir, at: new Date('2026-08-18T10:00:00Z') })

    expect(saved).toContain('2026-08-18')
    expect(existsSync(saved)).toBe(true)
  })

  /* Two presses in a term must leave two copies. One that silently replaces is not a backup. */
  it('names the file by the day rather than overwriting the last one', () => {
    const first = saveRecordsCopy({ from: dbPath, to: dir, at: new Date('2026-08-18T10:00:00Z') })
    const later = saveRecordsCopy({ from: dbPath, to: dir, at: new Date('2026-09-02T10:00:00Z') })

    expect(first).not.toBe(later)
    expect(existsSync(first)).toBe(true)
    expect(existsSync(later)).toBe(true)
  })
})

describe('export for a spreadsheet', () => {
  it('is a register: one row per child per Lesson', () => {
    const csv = recordsCsv(records.db)
    const lines = csv.trim().split('\n')

    expect(lines[0]).toBe('Lesson,Started,Class,Student,Drone,Team,Points reached')
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain('Priya')
    expect(lines[1]).toContain('Drone 1')
    expect(lines[1]?.endsWith(',1')).toBe(true)
  })

  /* Excel is the reader. A Lesson called "Year 8, period 3" must not become two columns. */
  it('quotes a value carrying a comma', () => {
    const csv = recordsCsv(records.db)

    expect(csv).toContain('"Year 8, period 3"')
  })

  it('writes it where a Teacher can find it', () => {
    const saved = exportRecordsCsv({ to: dir, at: new Date('2026-08-18T10:00:00Z'), db: records.db })

    expect(saved.endsWith('.csv')).toBe(true)
    expect(readFileSync(saved, 'utf8')).toContain('Priya')
  })

  /* No live readings here either. A register holds what happened. */
  it('carries no altitude, battery or position', () => {
    const csv = recordsCsv(records.db).toLowerCase()

    for (const word of ['altitude', 'battery', 'east', 'north']) {
      expect(csv, `the register mentions ${word}`).not.toContain(word)
    }
  })
})
