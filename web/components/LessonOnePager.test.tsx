import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  LESSON_ONE_PAGER_PRINT_CSS,
  LessonOnePager,
} from './LessonOnePager'
import type { LessonRecord } from '@/lib/logbook'

/**
 * One-page Lesson summary (#314) — paper tokens under @media print, same idea as
 * ReportsScreen.test.tsx (jsdom cannot see layout; assert the stylesheet).
 */

const CSS = readFileSync(resolve(process.cwd(), 'web/app/globals.css'), 'utf8')

function printBlock(): string {
  const at = CSS.indexOf('Printing a Lesson report.')
  expect(at, 'print comment missing from globals.css').toBeGreaterThan(-1)
  return CSS.slice(at)
}

const lesson: LessonRecord = {
  id: 'lesson-1',
  label: 'Period 3',
  startedAt: 1_000_000,
  endedAt: 1_800_000,
  fleetSize: 6,
  readyAtStart: 5,
  incidents: [
    {
      at: 1_200_000,
      text: 'Prop clipped the desk',
      severity: 'fault',
      droneName: 'Drone 1',
    },
  ],
  assignments: { 'drone-1': 'Ada' },
  commands: [{ at: 1, droneId: 'drone-1', droneName: 'Drone 1', kind: 'takeoff' }],
}

describe('LessonOnePager', () => {
  it('summarises the Lesson for a one-page sheet', () => {
    render(<LessonOnePager lesson={lesson} />)

    expect(screen.getByRole('article', { name: 'Lesson summary: Period 3' })).toBeTruthy()
    expect(screen.getByText('Period 3')).toBeTruthy()
    expect(screen.getByText(/Prop clipped the desk/)).toBeTruthy()
    expect(screen.getByText(/Ada \(Drone 1\)/)).toBeTruthy()
  })

  it('keeps the summary on one page under print', () => {
    expect(LESSON_ONE_PAGER_PRINT_CSS).toMatch(/@media print/)
    expect(LESSON_ONE_PAGER_PRINT_CSS).toMatch(/\.lesson-one-pager\s*\{[^}]*break-inside:\s*avoid/s)
    expect(LESSON_ONE_PAGER_PRINT_CSS).toMatch(/page-break-inside:\s*avoid/)
  })

  it('forces paper colour tokens when printing, including dark theme', () => {
    const block = printBlock()
    expect(block).toMatch(/\[data-theme='dark'\]/)
    expect(block).toMatch(/--foreground:\s*#1b1815/)
    expect(block).toMatch(/--background:\s*#ffffff/)
    expect(block).toMatch(/color-scheme:\s*light/)

    expect(LESSON_ONE_PAGER_PRINT_CSS).toMatch(/background:\s*#ffffff/)
    expect(LESSON_ONE_PAGER_PRINT_CSS).toMatch(/color:\s*#1b1815/)
    expect(LESSON_ONE_PAGER_PRINT_CSS).toMatch(/color-scheme:\s*light/)
  })
})
