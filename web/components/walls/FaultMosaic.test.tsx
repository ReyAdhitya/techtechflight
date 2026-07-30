import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import {
  aDroneState,
  aFleetState,
  aTelemetry,
} from '@techtechflight/contract/fixtures'
import type { DroneState } from '@techtechflight/contract'
import { FleetProvider, useFleet } from '@/components/FleetProvider'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { fleetVitals, type DroneVitals } from '@/lib/vitals'
import { FaultMosaic } from './FaultMosaic'
import {
  faultMosaicSummary,
  isFaultMosaicPriority,
  sortFaultMosaicEntries,
  type FaultMosaicEntry,
} from './fault-mosaic'
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

function entry(vitals: DroneVitals, stale: boolean, boardIndex: number): FaultMosaicEntry {
  return { vitals, stale, boardIndex }
}

let scenarios: ReturnType<typeof useFleet>['scenarios'] | null = null

function FaultMosaicWithScenarios() {
  scenarios = useFleet().scenarios
  return (
    <WallsShell title="Faults">
      <FaultMosaic />
    </WallsShell>
  )
}

const droneLinksInOrder = (): string[] =>
  screen
    .getAllByRole('link')
    .filter((link) => link.getAttribute('href')?.startsWith('/drone?id='))
    .map((link) => link.textContent ?? '')

beforeEach(() => {
  pathname.current = '/demo'
  scenarios = null
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('isFaultMosaicPriority', () => {
  it('is true for Fault status, emergency phase, and stale silence', () => {
    const fault = vitalsFor(
      aDroneState({
        status: 'Fault',
        lastContact: NOW,
        telemetry: aTelemetry({ fault: { code: 'IMU', description: 'Recalibrate' } }),
      }),
    )
    expect(isFaultMosaicPriority(fault, false)).toBe(true)

    const emergency = vitalsFor(
      aDroneState({
        status: 'Ready',
        lastContact: NOW,
        telemetry: aTelemetry({ emergencyStopTriggered: true }),
      }),
    )
    expect(isFaultMosaicPriority(emergency, false)).toBe(true)

    const ready = vitalsFor(
      aDroneState({
        status: 'Ready',
        lastContact: NOW,
        telemetry: aTelemetry({ airborne: false }),
      }),
    )
    expect(isFaultMosaicPriority(ready, true)).toBe(true)
    expect(isFaultMosaicPriority(ready, false)).toBe(false)
  })
})

describe('sortFaultMosaicEntries', () => {
  it('puts priority tiles first while preserving board order within each group', () => {
    const ok1 = vitalsFor(
      aDroneState({ id: 'a', name: 'A', status: 'Ready', lastContact: NOW, telemetry: aTelemetry() }),
    )
    const ok2 = vitalsFor(
      aDroneState({ id: 'b', name: 'B', status: 'Flying', lastContact: NOW, telemetry: aTelemetry({ airborne: true }) }),
    )
    const fault = vitalsFor(
      aDroneState({
        id: 'c',
        name: 'C',
        status: 'Fault',
        lastContact: NOW,
        telemetry: aTelemetry({ fault: { code: 'IMU', description: 'Fault' } }),
      }),
    )
    const stale = vitalsFor(
      aDroneState({ id: 'd', name: 'D', status: 'Ready', lastContact: NOW, telemetry: aTelemetry() }),
    )

    const sorted = sortFaultMosaicEntries([
      entry(ok1, false, 0),
      entry(fault, false, 1),
      entry(ok2, false, 2),
      entry(stale, true, 3),
    ])

    expect(sorted.map((e) => e.vitals.droneId)).toEqual(['c', 'd', 'a', 'b'])
  })
})

describe('faultMosaicSummary', () => {
  it('counts only priority tiles', () => {
    const entries = [
      entry(vitalsFor(aDroneState({ status: 'Ready', lastContact: NOW, telemetry: aTelemetry() })), false, 0),
      entry(
        vitalsFor(
          aDroneState({
            status: 'Fault',
            lastContact: NOW,
            telemetry: aTelemetry({ fault: { code: 'IMU', description: 'Fault' } }),
          }),
        ),
        false,
        1,
      ),
    ]
    expect(faultMosaicSummary(entries)).toBe(1)
  })
})

describe('Fault mosaic wall', () => {
  it('renders linked tiles after the Fleet settles', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <FaultMosaicWithScenarios />
      </FleetProvider>,
    )
    settle()

    expect(screen.getByRole('heading', { name: 'Faults' })).toBeInTheDocument()

    for (const name of ['Drone 1', 'Drone 2', 'Drone 3', 'Drone 4', 'Drone 5', 'Drone 6']) {
      const link = screen.getByRole('link', { name: new RegExp(name) })
      expect(link).toHaveAttribute('href', expect.stringMatching(/^\/drone\?id=ttf-/))
    }
  })

  it('sorts a faulted Drone to the front when it was last in board order', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <FaultMosaicWithScenarios />
      </FleetProvider>,
    )
    settle()

    expect(droneLinksInOrder()[0]).toMatch(/Drone 1/)

    act(() => {
      scenarios?.injectFault('ttf-0006')
    })
    act(() => {
      vi.advanceTimersByTime(1_000)
    })

    expect(droneLinksInOrder()[0]).toMatch(/Drone 6/)

    const link = screen.getByRole('link', { name: /Drone 6/ })
    const tile = link.closest('li')
    expect(tile).not.toBeNull()
    expect(tile).toHaveClass('border-status-fault')
    expect(within(tile as HTMLElement).getByText('Fault')).toBeInTheDocument()
  })
})
