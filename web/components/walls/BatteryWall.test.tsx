import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import {
  aDroneState,
  aFleetState,
  aTelemetry,
} from '@techtechflight/contract/fixtures'
import type { DroneState } from '@techtechflight/contract'
import { FleetProvider } from '@/components/FleetProvider'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { fleetVitals, type DroneVitals } from '@/lib/vitals'
import { BatteryWall } from './BatteryWall'
import { batteryWallSummary, isBatteryCritical } from './battery-wall'
import { WallsShell } from './WallsShell'

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const NOW = 1_000_000

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

function vitalsFor(drone: DroneState): DroneVitals {
  const state = aFleetState([drone], NOW)
  return fleetVitals({
    state,
    receivedAt: NOW,
    now: NOW,
    batteries: [],
    rates: new Map(),
  })[0]!
}

beforeEach(() => {
  pathname.current = '/demo'
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('isBatteryCritical', () => {
  it('is false when charge is at or above the usable threshold', () => {
    const ok = aDroneState({
      status: 'Ready',
      lastContact: NOW,
      telemetry: aTelemetry({ airborne: false, batteryFraction: 0.3 }),
    })
    expect(isBatteryCritical(vitalsFor(ok))).toBe(false)

    const high = aDroneState({
      status: 'Ready',
      lastContact: NOW,
      telemetry: aTelemetry({ airborne: false, batteryFraction: 0.85 }),
    })
    expect(isBatteryCritical(vitalsFor(high))).toBe(false)
  })

  it('is true when charge is below the usable threshold', () => {
    const low = aDroneState({
      status: 'Not Ready',
      lastContact: NOW,
      telemetry: aTelemetry({ airborne: false, batteryFraction: 0.29 }),
    })
    expect(isBatteryCritical(vitalsFor(low))).toBe(true)
  })

  it('is false when charge is not reported', () => {
    const noTelemetry = aDroneState({
      status: 'Offline',
      lastContact: null,
      telemetry: null,
    })
    expect(isBatteryCritical(vitalsFor(noTelemetry))).toBe(false)
  })
})

describe('batteryWallSummary', () => {
  it('counts only sub-threshold Drones', () => {
    const vitals = [
      vitalsFor(
        aDroneState({
          status: 'Ready',
          lastContact: NOW,
          telemetry: aTelemetry({ batteryFraction: 0.9 }),
        }),
      ),
      vitalsFor(
        aDroneState({
          status: 'Not Ready',
          lastContact: NOW,
          telemetry: aTelemetry({ batteryFraction: 0.1 }),
        }),
      ),
    ]
    expect(batteryWallSummary(vitals)).toBe(1)
  })
})

describe('BatteryWall', () => {
  it('renders summary and tiles linked to drone detail', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <WallsShell title="Battery">
          <BatteryWall />
        </WallsShell>
      </FleetProvider>,
    )
    settle()

    expect(screen.getByRole('heading', { name: 'Battery' })).toBeInTheDocument()
    expect(
      screen.getByText((_content, element) =>
        element?.tagName === 'P' ? /^\d+ critical$/.test(element.textContent ?? '') : false,
      ),
    ).toBeInTheDocument()
    const links = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('/drone?id='))
    expect(links.length).toBeGreaterThan(0)
  })
})
