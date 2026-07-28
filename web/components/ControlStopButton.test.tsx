import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { ControlScreen } from './ControlScreen'
import { FleetProvider } from './FleetProvider'

/**
 * Stop immediately, then Release stop once the latch is on Telemetry.
 *
 * The old label "Stop — hold" described the gesture, not the action. After the motors are
 * cut the same CTA must not stay — a Teacher would think Stop had failed to take.
 */

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

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
  it('reads Stop immediately, never Stop — hold', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    expect(screen.getAllByRole('button', { name: 'Stop immediately' }).length).toBe(6)
    expect(screen.queryByRole('button', { name: /Stop — hold/ })).not.toBeInTheDocument()
  })

  it('becomes Release stop after the latch, and clears it', async () => {
    vi.useRealTimers()
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1_500))
    })

    const stop = screen.getAllByRole('button', { name: 'Stop immediately' })[0]!
    const strip = stop.closest('li')!
    fireEvent.pointerDown(stop)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1_000))
    })
    fireEvent.pointerUp(stop)

    await waitFor(() => {
      expect(within(strip).getByRole('button', { name: 'Release stop' })).toBeInTheDocument()
    })
    expect(within(strip).queryByRole('button', { name: 'Stop immediately' })).not.toBeInTheDocument()

    fireEvent.click(within(strip).getByRole('button', { name: 'Release stop' }))
    await waitFor(() => {
      expect(within(strip).getByRole('button', { name: 'Stop immediately' })).toBeInTheDocument()
    })
  })
})
