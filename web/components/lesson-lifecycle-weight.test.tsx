import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { clearLogbook } from '@/lib/logbook'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { ControlScreen } from './ControlScreen'
import { FleetProvider } from './FleetProvider'
import { LessonScreen } from './LessonScreen'

/**
 * The two ends of a lesson, weighed against each other.
 *
 * "Start the lesson" and "End the lesson" are symmetrical halves of one lifecycle, and they
 * live in different files — `LessonScreen` and `LessonStrip` — each with its own copy of a
 * class string. "End the lesson" was a ghost button for exactly that reason: nothing tied
 * the two together, so one could be restyled and the other forgotten, and it was.
 *
 * A Teacher has to find the closing control across a room, at the moment a class is packing
 * up, which is the least attentive moment of the lesson. This asserts the pair carry the same
 * weight rather than asserting either one's particular classes, so a future restyle of both
 * together passes and a restyle of one alone fails.
 *
 * jsdom has no layout engine and cannot see contrast, so this is checked on the utilities the
 * markup carries (CLAUDE.md).
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

/** The utilities that make a control read as primary rather than as an aside. */
const weightOf = (button: HTMLElement) =>
  ['bg-ink', 'text-canvas', 'border-0', 'font-medium'].filter((utility) =>
    button.className.split(/\s+/).includes(utility),
  )

beforeEach(() => {
  clearLogbook()
  pathname.current = '/demo'
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('starting and ending a lesson', () => {
  it('gives both controls the same weight', () => {
    const lesson = render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <LessonScreen />
      </FleetProvider>,
    )
    settle()

    const start = screen.getByRole('button', { name: /Start the lesson/ })
    const startWeight = weightOf(start)
    expect(startWeight).toEqual(['bg-ink', 'text-canvas', 'border-0', 'font-medium'])

    fireEvent.click(start)
    settle()
    lesson.unmount()

    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    const end = screen.getByRole('button', { name: /End the lesson/ })
    expect(weightOf(end)).toEqual(startWeight)
  })

  /*
   * design.md §9 reserves colour for exception. A lesson ending on time is the normal path,
   * so the contrast comes from the ink fill every primary control uses and not from a Status
   * colour, which would read as something having gone wrong.
   */
  it('does not reach for a Status colour to get the contrast', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <LessonScreen />
      </FleetProvider>,
    )
    settle()
    fireEvent.click(screen.getByRole('button', { name: /Start the lesson/ }))
    settle()

    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    const end = screen.getByRole('button', { name: /End the lesson/ })
    expect(end.className).not.toMatch(/status-/)
  })
})
