import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import {
  aDroneState,
  aFleetState,
  aNoResponseDrone,
  aTelemetry,
} from '@techtechflight/contract/fixtures'
import type { DroneState } from '@techtechflight/contract'
import { FleetProvider } from '@/components/FleetProvider'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { fleetVitals, type DroneVitals } from '@/lib/vitals'
import { ReadyWall } from './ReadyWall'
import { readyBoardLabel, readyBoardSummary } from './ready-mapping'
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

describe('readyBoardLabel', () => {
  it('maps Offline and no contact to Offline', () => {
    expect(readyBoardLabel(vitalsFor(aNoResponseDrone()))).toBe('Offline')
  })

  it('maps stale silence to Offline', () => {
    const drone = aDroneState({
      status: 'Ready',
      lastContact: NOW - 120_000,
      stale: true,
      telemetry: aTelemetry(),
    })
    expect(readyBoardLabel(vitalsFor(drone))).toBe('Offline')
  })

  it('maps Fault status and fault alerts to Fault', () => {
    const byStatus = aDroneState({
      status: 'Fault',
      lastContact: NOW,
      telemetry: aTelemetry({
        fault: { code: 'IMU', description: 'Recalibrate' },
      }),
    })
    expect(readyBoardLabel(vitalsFor(byStatus))).toBe('Fault')
  })

  it('maps emergency stop to Fault', () => {
    const drone = aDroneState({
      status: 'Ready',
      lastContact: NOW,
      telemetry: aTelemetry({ emergencyStopTriggered: true }),
    })
    expect(readyBoardLabel(vitalsFor(drone))).toBe('Fault')
  })

  it('maps grounded serviceable Ready to Ready', () => {
    const drone = aDroneState({
      status: 'Ready',
      lastContact: NOW,
      telemetry: aTelemetry({ airborne: false, batteryFraction: 0.9 }),
    })
    expect(readyBoardLabel(vitalsFor(drone))).toBe('Ready')
  })

  it('maps Flying and Not Ready to Not ready', () => {
    const flying = aDroneState({
      status: 'Flying',
      lastContact: NOW,
      telemetry: aTelemetry({ airborne: true }),
    })
    const notReady = aDroneState({
      status: 'Not Ready',
      lastContact: NOW,
      telemetry: aTelemetry({ airborne: false, batteryFraction: 0.12 }),
    })
    expect(readyBoardLabel(vitalsFor(flying))).toBe('Not ready')
    expect(readyBoardLabel(vitalsFor(notReady))).toBe('Not ready')
  })
})

describe('readyBoardSummary', () => {
  it('counts Offline and Fault in the not-ready bucket', () => {
    expect(
      readyBoardSummary(['Ready', 'Ready', 'Not ready', 'Offline', 'Fault']),
    ).toEqual({ ready: 2, notReady: 3 })
  })
})

describe('ReadyWall', () => {
  it('renders summary and tiles linked to drone detail', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <WallsShell title="Ready">
          <ReadyWall />
        </WallsShell>
      </FleetProvider>,
    )
    settle()

    expect(screen.getByRole('heading', { name: 'Ready' })).toBeInTheDocument()
    expect(
      screen.getByText((_, element) =>
        Boolean(element?.classList.contains('text-summary') && element.textContent?.includes('ready,')),
      ),
    ).toBeInTheDocument()
    const links = screen.getAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('/drone?id='))
    expect(links.length).toBeGreaterThan(0)
  })
})
