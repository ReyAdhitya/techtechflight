import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { ControlScreen } from './ControlScreen'
import { FleetProvider, useFleet } from './FleetProvider'

/**
 * Stop, then Release stop once the latch is on Telemetry.
 *
 * After the motors are cut the same CTA must not stay — a Teacher would think Stop had
 * failed to take. The primary label is just Stop (not "Stop immediately"). Owner wants a
 * single click — no press-and-hold, no second confirm. Fleet-wide Stop all is a separate
 * hold control and must not steal this vocabulary.
 */

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

let scenarios: ReturnType<typeof useFleet>['scenarios']

function ControlWithScenarios() {
  scenarios = useFleet().scenarios
  return <ControlScreen />
}

beforeEach(() => {
  pathname.current = '/demo'
  scenarios = null
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the emergency stop on a flight strip', () => {
  it('reads Stop on an airborne strip, never Stop immediately or Stop — hold', () => {
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

    expect(screen.getByRole('button', { name: /^Stop$/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Stop immediately/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Stop — hold$/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Press again to stop$/ })).not.toBeInTheDocument()
  })

  it('becomes Release stop after one click, and clears it', async () => {
    vi.useRealTimers()
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlWithScenarios />
      </FleetProvider>,
    )
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1_500))
    })

    act(() => {
      scenarios?.takeOff('ttf-0001')
      scenarios?.setAltitude('ttf-0001', 2)
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500))
    })

    const strip = document.getElementById('control-strip-ttf-0001')!
    const stop = within(strip).getByRole('button', { name: /^Stop$/ })
    fireEvent.click(stop)

    await waitFor(() => {
      expect(within(strip).getByRole('button', { name: 'Release stop' })).toBeInTheDocument()
    })
    expect(within(strip).queryByRole('button', { name: /^Stop$/ })).not.toBeInTheDocument()
    expect(within(strip).queryByText(/Stop — done/)).not.toBeInTheDocument()

    fireEvent.click(within(strip).getByRole('button', { name: 'Release stop' }))
    await waitFor(() => {
      expect(within(strip).getByRole('button', { name: /^Stop$/ })).toBeInTheDocument()
    })
    expect(within(strip).queryByText(/Stop — done/)).not.toBeInTheDocument()
  })
})
