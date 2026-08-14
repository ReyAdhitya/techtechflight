import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { clearLogbook, readLogbook, runningLesson } from '@/lib/logbook'
import { clearWarmUpSkip } from '@/lib/warm-up-skip'
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
  clearWarmUpSkip()
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

  /*
   * The way back is the rail, and it is the only one.
   *
   * "Change the set-up" was a disclosure on this panel holding the plan, added when starting a
   * Lesson took the plan off the screen with it. The rail carries steps 1 to 5 now, always
   * visible and always tappable, so the disclosure was a second door into a room with one --
   * and a second door is a thing a Teacher has to decide about every time they pass it.
   */
  it('offers no second door back to the set-up', () => {
    screenUnderTest()
    settle()

    fireEvent.click(screen.getByRole('button', { name: /Start the lesson/i }))
    settle()

    expect(screen.queryByText('Change the set-up')).not.toBeInTheDocument()
  })

  /*
   * Nothing has flown yet, so there is no moment to bookmark and no incident to note. Both
   * live on the strip above every in-the-air step, which is where the moments are.
   */
  it('offers no Bookmark or Note incident on the way in', () => {
    screenUnderTest()
    settle()

    fireEvent.click(screen.getByRole('button', { name: /Start the lesson/i }))
    settle()

    expect(screen.queryByRole('button', { name: /Bookmark moment/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Note incident/i })).not.toBeInTheDocument()
  })

  it('hands over to the clearance queue once it is running', () => {
    screenUnderTest()
    settle()

    fireEvent.click(screen.getByRole('button', { name: /Start the lesson/i }))
    settle()

    expect(screen.getByRole('link', { name: /Open the clearance queue/i })).toHaveAttribute(
      'href',
      '/mission?step=6',
    )
  })
})

describe('Fleet health before the period', () => {
  /*
   * This was a serviceable headline, a ready / not-ready count and a list of every craft
   * standing in the way. All three answered "what is wrong with the Fleet", which is the
   * Fleet board's question, and it answers it with every Drone's Status and fault. One
   * line here says whether the period can run, and links to the list.
   */
  it('answers whether the period can run in one line, and links to Fleet', () => {
    screenUnderTest()
    settle()

    const summary = screen.getByRole('link', { name: /serviceable/ })
    expect(summary).toHaveAttribute('href', '/')
    expect(summary).toHaveTextContent(/\d+ of \d+ serviceable/)
    expect(summary).toHaveTextContent(/needs? attention|nothing needs attention/)
  })

  it('leaves the craft-by-craft fault list to the Fleet board', () => {
    screenUnderTest()
    settle()

    // Pre-flight check is Mission prep (per craft). The old Fleet "Standing in the way"
    // list does not live here.
    expect(screen.queryByRole('heading', { name: 'Standing in the way' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /serviceable/ })).toHaveAttribute('href', '/')
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

/**
 * The full-screen minute over the start of a Lesson, and the press that dismisses it.
 *
 * Skip lived in the state of the panel that draws it, so every walk back to step 1 inside that
 * first minute put it over the Teacher again. A rail is made to be walked up and down.
 */
describe('the warm-up minute', () => {
  const startALesson = () => {
    screenUnderTest()
    settle()
    fireEvent.click(screen.getByRole('button', { name: /Start the lesson/i }))
    settle()
  }

  it('covers the screen when a Lesson has just started', () => {
    startALesson()

    expect(screen.getByRole('dialog', { name: 'Lesson warm-up' })).toBeInTheDocument()
  })

  it('stays skipped when the Teacher comes back to step 1', () => {
    startALesson()
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    settle()
    expect(screen.queryByRole('dialog', { name: 'Lesson warm-up' })).not.toBeInTheDocument()

    // Away up the rail and back, well inside the minute.
    cleanup()
    screenUnderTest()
    settle()

    expect(screen.queryByRole('dialog', { name: 'Lesson warm-up' })).not.toBeInTheDocument()
  })
})
