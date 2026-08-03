import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ReportsCsvButton } from './ReportsCsvButton'
import { downloadReportsCsv } from '@/lib/reports-csv'
import type { LessonRecord } from '@/lib/logbook'

vi.mock('@/lib/reports-csv', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/reports-csv')>()
  return {
    ...actual,
    downloadReportsCsv: vi.fn(),
  }
})

const lesson: LessonRecord = {
  id: 'lesson-1',
  label: 'Period 3',
  startedAt: 1_000_000,
  endedAt: 1_800_000,
  fleetSize: 6,
  readyAtStart: 5,
  incidents: [],
}

describe('ReportsCsvButton', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('offers Download CSV and saves a file without printing', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})

    render(<ReportsCsvButton lessons={[lesson]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Download CSV' }))
    expect(downloadReportsCsv).toHaveBeenCalledTimes(1)
    expect(downloadReportsCsv).toHaveBeenCalledWith({ lessons: [lesson] })
    expect(print).not.toHaveBeenCalled()
  })
})
