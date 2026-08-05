import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { clearLogbook, readLogbook, runningLesson } from '@/lib/logbook'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { FleetProvider } from './FleetProvider'
import { LessonScreen } from './LessonScreen'
import * as readyMapping from './walls/ready-mapping'

/**
 * Requirement E7, which gets a screen test of its own because it is the requirement the
 * rest of this screen is most likely to destroy.
 *
 * A Teacher opens the board at 08:55 with a class already arriving. Planning is an
 * affordance and never a gate: no name, no Students, no Exercises, and "Start the lesson"
 * still works and everything downstream still works.
 */

const pathname = vi.hoisted(() => ({ current: '/demo' }))
// The Lesson screen reads its set-up step from `?step=`.
const search = vi.hoisted(() => ({ current: new URLSearchParams() }))
vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
  useSearchParams: () => search.current,
}))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

const screenUnderTest = () =>
  render(
    <FleetProvider demonstration={PINNED_DEMONSTRATION}>
      <LessonScreen />
    </FleetProvider>,
  )

beforeEach(() => {
  clearLogbook()
  pathname.current = '/demo'
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('starting a lesson with nothing filled in', () => {
  it('offers to start at all', () => {
    screenUnderTest()
    settle()

    expect(screen.getByRole('button', { name: /Start the lesson/i })).toBeEnabled()
  })

  it('starts, with no name, no Students and no Exercises', () => {
    screenUnderTest()
    settle()

    fireEvent.click(screen.getByRole('button', { name: /Start the lesson/i }))

    const lesson = runningLesson(readLogbook())
    expect(lesson).not.toBeNull()
    expect(lesson?.exercises).toEqual([])
    expect(lesson?.assignments).toEqual({})
    // Named rather than blank, so the record is readable next term.
    expect(lesson?.label).toBe('Untitled lesson')
  })

  it('hands over to the Flight Control Center once it is running', () => {
    screenUnderTest()
    settle()

    fireEvent.click(screen.getByRole('button', { name: /Start the lesson/i }))
    settle()

    expect(screen.getByRole('link', { name: /Flight Control Center/i })).toHaveAttribute(
      'href',
      '/control',
    )
  })
})

describe('pre-flight checklist', () => {
  it('shows ready and not ready counts from the Ready wall mapping', () => {
    screenUnderTest()
    settle()

    expect(screen.getByRole('heading', { name: 'Pre-flight check' })).toBeInTheDocument()
    expect(
      screen.getByText((_, element) =>
        Boolean(element?.classList.contains('text-summary') && element.textContent?.includes('ready ·')),
      ),
    ).toBeInTheDocument()
  })

  it('warns calmly when none are ready but does not block Start', () => {
    const summary = vi.spyOn(readyMapping, 'readyBoardSummary')
    summary.mockReturnValue({ ready: 0, notReady: 6 })

    screenUnderTest()
    settle()

    expect(screen.getByText(/None ready to fly yet/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start the lesson/i })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: /Start the lesson/i }))

    expect(runningLesson(readLogbook())?.readyAtStart).toBe(0)

    summary.mockRestore()
  })
})
