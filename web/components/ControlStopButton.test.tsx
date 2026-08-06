import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { ControlScreen } from './ControlScreen'
import { FleetProvider } from './FleetProvider'

/**
 * Stop, then Release stop once the latch is on Telemetry.
 *
 * After the motors are cut the same CTA must not stay — a Teacher would think Stop had
 * failed to take. The primary label is just Stop (not "Stop immediately"). Owner wants a
 * single click — no press-and-hold, no second confirm.
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

describe('the emergency stop on a flight strip', () => {
  it('reads Stop, never Stop immediately or Stop. Hold', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    // Six strips; the ATC toolbar also has a fleet Stop.
    expect(screen.getAllByRole('button', { name: /^Stop$/ }).length).toBeGreaterThanOrEqual(6)
    expect(screen.queryByRole('button', { name: /Stop immediately/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Stop, hold/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Press again to stop/ })).not.toBeInTheDocument()
  })

  it('becomes Release stop after one click, and clears it', async () => {
    vi.useRealTimers()
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1_500))
    })

    const stripEl = document.getElementById('control-strip-ttf-0001')
    if (stripEl === null) throw new Error('missing strip ttf-0001')
    const strip = within(stripEl)
    const stop = strip.getByRole('button', { name: /^Stop$/ })
    fireEvent.click(stop)

    await waitFor(() => {
      expect(strip.getByRole('button', { name: 'Release stop' })).toBeInTheDocument()
    })
    expect(strip.queryByRole('button', { name: /^Stop$/ })).not.toBeInTheDocument()
    expect(strip.queryByText(/Stop, done/)).not.toBeInTheDocument()

    fireEvent.click(strip.getByRole('button', { name: 'Release stop' }))
    await waitFor(() => {
      expect(strip.getByRole('button', { name: /^Stop$/ })).toBeInTheDocument()
    })
    expect(strip.queryByText(/Stop, done/)).not.toBeInTheDocument()
  })
})
