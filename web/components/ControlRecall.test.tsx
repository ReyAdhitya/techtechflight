import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import type { DroneCommand } from '@techtechflight/contract'
import { CommandTracker } from '@/lib/command-tracker'
import { FleetProvider, useFleet } from '@/components/FleetProvider'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { ControlScreen } from './ControlScreen'

/**
 * Recall on the command row — sent, waiting and done from Telemetry alone.
 *
 * Grounded strips stay compact; airborne strips show Commands. Nothing here is
 * optimistic: the receipt line follows what the Fleet reports.
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

function stripFor(droneId: string): HTMLElement {
  const strip = document.getElementById(`control-strip-${droneId}`)
  if (!strip) throw new Error(`missing strip ${droneId}`)
  return strip
}

beforeEach(() => {
  pathname.current = '/demo'
  scenarios = null
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Recall on the command row', () => {
  it('stays off grounded strips and joins Land, Hover and Stop once airborne', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlWithScenarios />
      </FleetProvider>,
    )
    settle()

    expect(screen.queryByRole('button', { name: /^Recall$/ })).not.toBeInTheDocument()

    act(() => {
      scenarios?.takeOff('ttf-0001')
      scenarios?.setAltitude('ttf-0001', 2)
    })
    act(() => {
      vi.advanceTimersByTime(1_000)
    })

    const strip = stripFor('ttf-0001')
    expect(within(strip).getByRole('button', { name: /^Land$/ })).toBeInTheDocument()
    expect(within(strip).getByRole('button', { name: /^Hover$/ })).toBeInTheDocument()
    expect(within(strip).getByRole('button', { name: /^Recall$/ })).toBeInTheDocument()
    expect(within(strip).getByRole('button', { name: /^Stop$/ })).toBeInTheDocument()
  })

  it('is enabled only while airborne', () => {
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

    const strip = stripFor('ttf-0001')
    expect(within(strip).getByRole('button', { name: /^Recall$/ })).toBeEnabled()
  })

  it('reads sent before the Fleet answers', () => {
    const tracker = new CommandTracker()
    const command: DroneCommand = {
      id: 'c-recall',
      droneId: 'ttf-0001',
      kind: 'return-home',
      issuedAt: 1_000,
    }
    tracker.issue(command)
    expect(tracker.latestFor('ttf-0001')?.stage).toBe('sent')
  })

  it('shows waiting then done from Telemetry alone', () => {
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

    const strip = stripFor('ttf-0001')
    fireEvent.click(within(strip).getByRole('button', { name: /^Recall$/ }))

    // The demo Fleet answers in the same turn — waiting is the first receipt on screen.
    expect(within(strip).getByText('Recall — waiting for a response')).toBeInTheDocument()
    expect(within(strip).queryByText(/Recall — done/)).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(within(strip).getByText('Recall — done')).toBeInTheDocument()
  })
})
