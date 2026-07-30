import { describe, expect, it } from 'vitest'
import {
  REPORTS_PDF_FILENAME,
  buildReportsPdfBytes,
} from './reports-pdf'
import type { LessonRecord } from './logbook'

/**
 * Reports PDF (#92) — a real file, not browser print chrome.
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

describe('buildReportsPdfBytes', () => {
  it('emits a PDF that starts with the PDF magic and carries the product title', () => {
    const bytes = Buffer.from(buildReportsPdfBytes({
      lessons: [finishedLesson()],
      defects: [{ name: 'Drone 1', faults: 2, dropouts: 1, flights: 4 }],
    }))
    expect(bytes.subarray(0, 5).toString('ascii')).toBe('%PDF-')

    const asLatin = bytes.toString('latin1')
    expect(asLatin).toContain('TechTech Flight - Lesson records')
    expect(asLatin).toContain('Period 3')
    expect(asLatin).toContain('Drone 1')
    expect(REPORTS_PDF_FILENAME).toMatch(/\.pdf$/)
  })

  it('still builds a valid PDF when nothing has been completed', () => {
    const bytes = Buffer.from(buildReportsPdfBytes({ lessons: [], defects: [] }))
    expect(bytes.subarray(0, 5).toString('ascii')).toBe('%PDF-')
    expect(bytes.toString('latin1')).toContain('No Lesson has been completed')
  })
})
