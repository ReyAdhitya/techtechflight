import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { ControlScreen } from './ControlScreen'
import { FleetProvider } from './FleetProvider'
import { TrainingWheelsProvider } from '@/lib/training-wheels'

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
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <TrainingWheelsProvider>
          <ControlScreen />
        </TrainingWheelsProvider>
      </FleetProvider>,
    )
    settle()

    expect(screen.getAllByRole('button', { name: 'Stop' }).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Training wheels off' }))
    settle()

    expect(screen.getByText(/Training wheels/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Stop' })).toBeNull()
  })
})
