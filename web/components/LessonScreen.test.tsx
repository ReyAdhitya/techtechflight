import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { clearLogbook, readLogbook, runningLesson } from '@/lib/logbook'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { FleetProvider } from './FleetProvider'
import { LessonScreen } from './LessonScreen'

/**
 * Requirement E7, which gets a screen test of its own because it is the requirement the
 * rest of this screen is most likely to destroy.
 *
 * A Teacher opens the board at 08:55 with a class already arriving. Planning is an
 * affordance and never a gate: no name, no Students, no Exercises, and "Start the lesson"
 * still works and everything downstream still works.
 */

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

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
  it('says Lesson records live in this browser, not on Vercel', () => {
    screenUnderTest()
    settle()

    expect(screen.getByRole('note')).toHaveTextContent(/this browser on this laptop/)
    expect(screen.getByRole('note')).toHaveTextContent(/not saved on Vercel/)
  })

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
