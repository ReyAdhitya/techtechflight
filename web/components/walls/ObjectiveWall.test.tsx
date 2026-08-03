import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { FleetProvider } from '@/components/FleetProvider'
import { clearLogbook, startLesson } from '@/lib/logbook'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { objectiveSentence, ObjectiveWall } from './ObjectiveWall'
import { WallsShell } from './WallsShell'

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

beforeEach(() => {
  pathname.current = '/demo'
  clearLogbook()
  vi.useFakeTimers()
})

afterEach(() => {
  clearLogbook()
  vi.useRealTimers()
})

describe('objectiveSentence', () => {
  it('uses the Exercise under way when the Lesson has a plan', () => {
    const lesson = {
      id: 'lesson-0',
      label: 'Year 8',
      startedAt: 0,
      endedAt: null,
      readyAtStart: 5,
      fleetSize: 6,
      incidents: [],
      exercises: [
        { id: 'e1', name: 'Hover and hold for thirty seconds.', minutes: 5 },
        { id: 'e2', name: 'Land on the pad.', minutes: 5 },
      ],
    }
    expect(objectiveSentence(lesson, 60_000)).toBe('Hover and hold for thirty seconds.')
    expect(objectiveSentence(lesson, 6 * 60_000)).toBe('Land on the pad.')
  })

  it('falls back to the Lesson label when there is no Exercise plan', () => {
    const lesson = {
      id: 'lesson-0',
      label: 'Practice smooth take-offs and landings.',
      startedAt: 0,
      endedAt: null,
      readyAtStart: 5,
      fleetSize: 6,
      incidents: [],
    }
    expect(objectiveSentence(lesson, 1_000)).toBe('Practice smooth take-offs and landings.')
  })
})

describe('ObjectiveWall', () => {
  it('renders one large sentence from the running Lesson', () => {
    startLesson('Year 8', 5, 6, 0, [
      { id: 'e1', name: 'Hover and hold for thirty seconds.' },
    ])

    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <WallsShell title="Objective">
          <ObjectiveWall now={1_000} />
        </WallsShell>
      </FleetProvider>,
    )
    settle()

    expect(screen.getByRole('heading', { name: 'Objective' })).toBeInTheDocument()
    const sentence = screen.getByText('Hover and hold for thirty seconds.')
    expect(sentence).toHaveClass('text-summary')
    expect(screen.getByLabelText("Today's objective")).toBeInTheDocument()
  })

  it('explains itself when no Lesson is running', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <WallsShell title="Objective">
          <ObjectiveWall />
        </WallsShell>
      </FleetProvider>,
    )
    settle()

    expect(screen.getByText(/No Lesson is running/)).toBeInTheDocument()
    expect(screen.queryByLabelText("Today's objective")).not.toBeInTheDocument()
  })
})
