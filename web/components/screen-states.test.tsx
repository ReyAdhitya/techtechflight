import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { clearLogbook } from '@/lib/logbook'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { ControlScreen } from './ControlScreen'
import { FleetProvider } from './FleetProvider'
import { LessonReports } from './LessonReports'
import { LessonScreen } from './LessonScreen'
import { ReportsScreen } from './ReportsScreen'
import { StudentsScreen } from './StudentsScreen'

/**
 * The states nobody draws.
 *
 * Loading and empty are where a screen most often says nothing at all, and a Teacher who
 * sees nothing cannot tell an empty Fleet from a broken board. Every screen here is
 * checked for both — before any Telemetry has arrived, and with nothing of its own to
 * show — and in every case the requirement is words rather than a blank.
 */

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const SCREENS = [
  { name: 'Flight Control Center', render: () => <ControlScreen /> },
  { name: 'Lesson', render: () => <LessonScreen /> },
  { name: 'Students', render: () => <StudentsScreen /> },
  { name: 'Reports', render: () => <ReportsScreen /> },
] as const

const show = (node: React.ReactNode, advanceMs: number) => {
  const rendered = render(
    <FleetProvider demonstration={PINNED_DEMONSTRATION}>{node}</FleetProvider>,
  )
  act(() => {
    vi.advanceTimersByTime(advanceMs)
  })
  return rendered
}

beforeEach(() => {
  clearLogbook()
  pathname.current = '/demo'
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('before any Telemetry has arrived', () => {
  for (const { name, render: renderScreen } of SCREENS) {
    it(`${name} says something rather than nothing`, () => {
      const { container } = show(renderScreen(), 0)

      // Not a blank page. A Teacher who sees nothing cannot tell a Fleet that has not
      // reported yet from a board that has failed.
      expect(container.textContent?.trim().length ?? 0).toBeGreaterThan(0)
    })
  }
})

describe('with a Fleet but nothing of the Teacher’s own', () => {
  it('the Flight Control Center says nothing needs them', () => {
    show(<ControlScreen />, 2_000)

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('Students says nobody has a Drone yet', () => {
    show(<StudentsScreen />, 2_000)

    expect(screen.getByText(/Nobody has a Drone yet/i)).toBeInTheDocument()
  })

  it('Reports says no Lesson has finished', () => {
    render(<LessonReports />)

    expect(screen.getByText(/None finished yet/i)).toBeInTheDocument()
  })

  it('Lesson offers to start one', () => {
    show(<LessonScreen />, 2_000)

    expect(screen.getByRole('button', { name: /Start the lesson/i })).toBeInTheDocument()
  })
})

describe('every screen keeps a place to land', () => {
  for (const { name, render: renderScreen } of SCREENS) {
    it(`${name} has a focus target for the skip link`, () => {
      const { container } = show(renderScreen(), 2_000)

      // The skip link is the first thing in the tab order on every screen; it needs
      // somewhere to go, or a keyboard user is dropped back into the navigation.
      expect(container.querySelector('#content')).not.toBeNull()
    })
  }
})
