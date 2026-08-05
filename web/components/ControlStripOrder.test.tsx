import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { ControlScreen } from './ControlScreen'
import { FleetProvider } from './FleetProvider'
import { ScenarioPanel } from './ScenarioPanel'

/**
 * Control's Every Drone list stays in boardOrder.
 *
 * Worst-first reshuffling (`compareStrips`) made the live list jump whenever an alert
 * appeared or cleared. Urgency belongs on the Attention bar only — deliberate position #1.
 */

const pathname = vi.hoisted(() => ({ current: '/demo' }))
// Control carries steps 6 to 11; this suite works the step that holds its subject.
const search = vi.hoisted(() => ({ current: new URLSearchParams('step=9') }))
vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
  useSearchParams: () => search.current,
}))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

beforeEach(() => {
  pathname.current = '/demo'
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

const stripNamesInEveryDrone = (): string[] => {
  const heading = screen.getByRole('heading', { name: 'Every Drone' })
  const section = heading.closest('section')
  expect(section, 'Every Drone section').not.toBeNull()
  return within(section!)
    .getAllByRole('link')
    .map((link) => link.textContent ?? '')
    .filter((name) => /^Drone \d$/.test(name))
}

describe('Every Drone on Control', () => {
  it('lists strips in board order while a later Drone is the one that needs you', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ScenarioPanel />
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    expect(stripNamesInEveryDrone()).toEqual([
      'Drone 1',
      'Drone 2',
      'Drone 3',
      'Drone 4',
      'Drone 5',
      'Drone 6',
    ])

    // Fault the last strip — under worst-first it would float to the top.
    const faultButtons = screen.getAllByRole('button', { name: /^Fault$/ })
    expect(faultButtons).toHaveLength(6)
    fireEvent.click(faultButtons[5]!)
    settle()

    expect(stripNamesInEveryDrone()).toEqual([
      'Drone 1',
      'Drone 2',
      'Drone 3',
      'Drone 4',
      'Drone 5',
      'Drone 6',
    ])

    // Alerts moved off this step entirely: the Attention bar is step 10's, and this is
    // step 9. What this test pins is unchanged — a faulted craft does not reorder the list
    // it is in. That the Alert is reachable on step 10 is ControlAttentionQueueDock's.
    expect(screen.queryByText(/items? require[s]? action/i)).not.toBeInTheDocument()
  })
})
