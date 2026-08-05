import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { clearLogbook, enqueueRemedial } from '@/lib/logbook'
import { FleetProvider } from './FleetProvider'
import { ReportsScreen } from './ReportsScreen'
import { downloadReportsPdf } from '@/lib/reports-pdf'

/**
 * Reports Download PDF (#92) and secondary Print — plus stylesheet invariants jsdom
 * cannot see (same idea as `SiteHeader.test.tsx`).
 */

vi.mock('next/navigation', () => ({
  usePathname: () => '/reports',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/reports-pdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/reports-pdf')>()
  return {
    ...actual,
    downloadReportsPdf: vi.fn(),
  }
})

const CSS = readFileSync(resolve(process.cwd(), 'web/app/globals.css'), 'utf8')

function printBlock(): string {
  const at = CSS.indexOf('Printing a Lesson report.')
  expect(at, 'print comment missing from globals.css').toBeGreaterThan(-1)
  return CSS.slice(at)
}

describe('Reports Download PDF', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.title = ''
  })

  it('offers Download PDF as the primary control and saves a file without printing', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})

    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ReportsScreen />
      </FleetProvider>,
    )

    const primary = screen.getByRole('button', { name: 'Download PDF' })
    expect(primary.className).toContain('bg-ink')
    fireEvent.click(primary)
    expect(downloadReportsPdf).toHaveBeenCalledTimes(1)
    expect(print).not.toHaveBeenCalled()
  })

  it('keeps Print as a secondary control that opens the browser dialog', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})

    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ReportsScreen />
      </FleetProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Print' }))
    expect(print).toHaveBeenCalledTimes(1)
    expect(document.title).toBe('TechTech Flight - Lesson records')
  })

  it('forces paper colour tokens when printing, including dark theme', () => {
    const block = printBlock()
    expect(block).toMatch(/\[data-theme='dark'\]/)
    expect(block).toMatch(/--foreground:\s*#1b1815/)
    expect(block).toMatch(/--background:\s*#ffffff/)
    expect(block).toMatch(/color-scheme:\s*light/)
  })

  it('avoids page breaks on Lesson cards only, not every section', () => {
    const block = printBlock()
    expect(block).toMatch(/\.lesson-report\s*\{[^}]*break-inside:\s*avoid/s)
    expect(block).not.toMatch(/\bli,\s*\n\s*section\s*\{/)
  })
})

/*
 * Who to follow up with belongs beside the record of what happened. It used to sit on the
 * Lesson screen, which is where a Teacher sets the next period up rather than reads the
 * last one.
 */
describe('the remedial queue on Reports', () => {
  afterEach(() => clearLogbook())

  it('lists a flagged craft beside the finished Lessons', () => {
    clearLogbook()
    enqueueRemedial({
      droneId: 'ttf-0003',
      droneName: 'Drone 3',
      reason: 'IMU fault mid-lesson',
      addedAt: 1_000,
    })

    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ReportsScreen />
      </FleetProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Remedial queue' })).toBeInTheDocument()
    expect(screen.getByText('IMU fault mid-lesson')).toBeInTheDocument()
  })
})
