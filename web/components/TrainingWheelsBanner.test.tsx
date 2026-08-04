import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { ControlScreen } from './ControlScreen'
import { FleetProvider, useFleet } from './FleetProvider'
import { TrainingWheelsProvider } from '@/lib/training-wheels'

let scenarios: ReturnType<typeof useFleet>['scenarios']

function ControlWithScenarios() {
  scenarios = useFleet().scenarios
  return (
    <TrainingWheelsProvider>
      <ControlScreen />
    </TrainingWheelsProvider>
  )
}

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

beforeEach(() => {
  pathname.current = '/demo'
  vi.useFakeTimers()
  window.localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('training wheels on Control', () => {
  it('hides Stop and shows the banner when training wheels are on', () => {
    scenarios = null
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlWithScenarios />
      </FleetProvider>,
    )
    settle()

    act(() => {
      scenarios?.takeOff('ttf-0001')
      scenarios?.setAltitude('ttf-0001', 2)
    })
    act(() => {
      vi.advanceTimersByTime(1_000)
    })

    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument()

    fireEvent.click(screen.getByText('More actions'))
    fireEvent.click(screen.getByRole('button', { name: 'Training wheels off' }))
    settle()

    expect(screen.getByText(/practice mode\. Stop is hidden/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Stop' })).toBeNull()
  })
})
