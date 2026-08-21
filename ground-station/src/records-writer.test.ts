import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openRecords, type RecordsDb } from './records-db.ts'
import { writeLesson, type LessonSnapshot } from './records-writer.ts'

/**
 * What a Lesson leaves behind.
 *
 * The three things worth pinning: a Lesson written twice leaves one record, a seeded Lesson is
 * labelled a demonstration in the record itself, and there is nowhere in here for a live
 * reading to land.
 */

let dir: string
let records: RecordsDb

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ttf-writer-'))
  records = openRecords(join(dir, 'records.db'))
})

afterEach(() => {
  records.close()
  rmSync(dir, { recursive: true, force: true })
})

const snapshot = (over: Partial<LessonSnapshot> = {}): LessonSnapshot => ({
  schoolName: 'Test Primary',
  className: 'Year 8',
  teacherName: 'Ms Adeyemi',
  lessonId: 'L-1',
  lessonLabel: 'Year 8, period 3',
  startedAt: '2026-08-18T09:00:00.000Z',
  endedAt: '2026-08-18T09:50:00.000Z',
  demonstration: false,
  scenario: {
    id: 'search-rescue',
    name: 'Search and Rescue',
    objective: 'Find the target',
    limitMinutes: 12,
  },
  missionId: 'M-1',
  missionStartedAt: '2026-08-18T09:10:00.000Z',
  missionSealedAt: '2026-08-18T09:45:00.000Z',
  drones: [{ id: 'ttf-0001', label: 'Drone 1' }],
  teams: [{ id: 'T-1', name: 'Red Team', studentIds: ['stu-priya'], droneId: 'ttf-0001' }],
  zones: [
    {
      id: 'Z-1',
      name: 'Over the desks',
      kind: 'no-fly',
      points: [
        { eastM: -3, northM: -2 },
        { eastM: 3, northM: -2 },
        { eastM: 3, northM: 2 },
      ],
    },
  ],
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
  ...over,
})

const count = (table: string) =>
  (records.db.prepare(`select count(*) as n from ${table}`).get() as { n: number }).n

describe('writing a Lesson into the records', () => {
  it('writes the room, the plan and what happened', () => {
    writeLesson(snapshot(), records)

    expect(count('school')).toBe(1)
    expect(count('lesson')).toBe(1)
    expect(count('mission')).toBe(1)
    expect(count('team_member')).toBe(1)
    expect(count('zone_point')).toBe(3)
    expect(count('flight')).toBe(1)
    expect(count('checkpoint_reached')).toBe(1)
  })

  it('keeps the corners in the order they were drawn', () => {
    writeLesson(snapshot(), records)

    const points = records.db
      .prepare('select ordinal, east_m from zone_point order by ordinal')
      .all() as { ordinal: number; east_m: number }[]

    expect(points.map((p) => p.ordinal)).toEqual([0, 1, 2])
    expect(points.map((p) => p.east_m)).toEqual([-3, 3, 3])
  })

  /* Sealed, reopened and sealed again must leave one record. A register cannot double-count. */
  it('leaves one record when the same Lesson is written twice', () => {
    writeLesson(snapshot(), records)
    writeLesson(snapshot({ missionSealedAt: '2026-08-18T09:47:00.000Z' }), records)

    expect(count('lesson')).toBe(1)
    expect(count('flight')).toBe(1)
    expect(count('zone_point')).toBe(3)
  })

  /* Nobody reading a register next term should have to work out which mornings were real. */
  it('labels a seeded Lesson a demonstration in the record itself', () => {
    writeLesson(snapshot({ demonstration: true }), records)

    const row = records.db.prepare('select label from lesson').get() as { label: string }
    expect(row.label).toContain('demonstration')
  })

  it('writes a Lesson that never ran a Mission', () => {
    writeLesson(snapshot({ scenario: null, missionId: null, teams: [], zones: [], seats: [] }), records)

    expect(count('lesson')).toBe(1)
    expect(count('mission')).toBe(0)
  })

  /*
   * The whole rule, checked at the place it would be broken. There is nowhere in the schema for
   * an altitude, a battery or a position, and the only coordinates are on the two tables that
   * hold what a Teacher set.
   */
  it('has nowhere to put a live reading', () => {
    writeLesson(snapshot(), records)

    const columns = records.db
      .prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%'")
      .all() as { name: string }[]

    for (const { name } of columns) {
      const info = records.db.prepare(`pragma table_info(${name})`).all() as { name: string }[]
      const fields = info.map((column) => column.name)
      expect(fields, `${name} holds an altitude`).not.toContain('altitude_m')
      expect(fields, `${name} holds a battery`).not.toContain('battery')
      if (name !== 'zone_point' && name !== 'checkpoint') {
        expect(fields, `${name} holds a position`).not.toContain('east_m')
      }
    }
  })
})
