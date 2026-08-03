import { describe, expect, it } from 'vitest'
import {
  REPORTS_CSV_FILENAME,
  buildReportsCsv,
  escapeCsvField,
} from './reports-csv'
import type { LessonRecord } from './logbook'

/**
 * Reports CSV (#308) — a spreadsheet opens cleanly; names with commas quote.
 */

const finishedLesson = (overrides: Partial<LessonRecord> = {}): LessonRecord => ({
  id: 'lesson-1',
  label: 'Period 3',
  startedAt: 1_000_000,
  endedAt: 1_800_000,
  fleetSize: 6,
  readyAtStart: 5,
  incidents: [],
  ...overrides,
})

describe('escapeCsvField', () => {
  it('leaves plain fields alone', () => {
    expect(escapeCsvField('Period 3')).toBe('Period 3')
  })

  it('quotes names that contain commas', () => {
    expect(escapeCsvField('Smith, Ada')).toBe('"Smith, Ada"')
  })

  it('doubles quotes inside a quoted field', () => {
    expect(escapeCsvField('said "land now"')).toBe('"said ""land now"""')
  })
})

describe('buildReportsCsv', () => {
  it('emits a CSV with Lesson and Incident headers and the product filename', () => {
    const csv = buildReportsCsv({
      lessons: [
        finishedLesson({
          label: 'Year 8, period 3',
          assignments: { 'drone-1': 'Smith, Ada' },
          incidents: [
            {
              at: 1_200_000,
              text: 'Prop clipped the desk, briefly',
              severity: 'fault',
              droneId: 'drone-1',
              droneName: 'Drone 1',
            },
          ],
        }),
      ],
    })

    expect(REPORTS_CSV_FILENAME).toMatch(/\.csv$/)
    expect(csv).toContain('Lesson,Started,Ended')
    expect(csv).toContain('"Year 8, period 3"')
    expect(csv).toContain('"Smith, Ada (Drone 1)"')
    expect(csv).toContain('Drone 1')
    expect(csv).toContain('fault')
    expect(csv).toContain('Prop clipped the desk, briefly')
  })

  it('still builds a readable CSV when nothing has been completed', () => {
    const csv = buildReportsCsv({ lessons: [] })
    expect(csv).toContain('No Lesson has been completed')
    expect(csv).toContain('No incidents recorded')
  })

  it('omits open Lessons from the export', () => {
    const csv = buildReportsCsv({
      lessons: [
        finishedLesson({ label: 'Closed' }),
        finishedLesson({ id: 'open', label: 'Still running', endedAt: null }),
      ],
    })
    expect(csv).toContain('Closed')
    expect(csv).not.toContain('Still running')
  })
})
