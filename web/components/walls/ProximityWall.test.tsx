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
import { fleetVitals, SEPARATION_WARNING_M, type DroneVitals } from '@/lib/vitals'
import type { ScenarioControls } from '@/lib/fleet-link'
import { ProximityWall } from './ProximityWall'
import {
  formatPairLabel,
  formatSeparationReadout,
  pairLinkDroneId,
  proximityPairs,
  proximityWallSummary,
} from './proximity-wall'
import { WallsShell } from './WallsShell'

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const NOW = 1_000_000

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

function vitalsFor(...drones: DroneState[]): readonly DroneVitals[] {
  const state = aFleetState(drones, NOW)
  return fleetVitals({
    state,
    receivedAt: NOW,
    now: NOW,
    batteries: [],
    rates: new Map(),
  })
}

let scenarios: ScenarioControls | null = null

function ProximityWallWithScenarios() {
  scenarios = useFleet().scenarios
  return (
    <WallsShell title="Proximity">
      <ProximityWall />
    </WallsShell>
  )
}

beforeEach(() => {
  pathname.current = '/demo'
  scenarios = null
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('proximityPairs', () => {
  it('lists each close pair once', () => {
    const a = aDroneState({
      id: 'a',
      name: 'A',
      status: 'Flying',
      lastContact: NOW,
      telemetry: aTelemetry({ airborne: true, position: { eastM: 0, northM: 0 } }),
    })
    const b = aDroneState({
      id: 'b',
      name: 'B',
      status: 'Flying',
      lastContact: NOW,
      telemetry: aTelemetry({
        airborne: true,
        position: { eastM: SEPARATION_WARNING_M - 0.5, northM: 0 },
      }),
    })
    const vitals = vitalsFor(a, b)
    const pairs = proximityPairs(vitals, [a, b])

    expect(pairs).toHaveLength(1)
    expect(pairs[0]!.callsignA).toBe('A')
    expect(pairs[0]!.callsignB).toBe('B')
    expect(pairs[0]!.separationM).toBeCloseTo(SEPARATION_WARNING_M - 0.5, 5)
  })

  it('ignores pairs at or beyond the warning distance', () => {
    const a = aDroneState({
      id: 'a',
      name: 'A',
      status: 'Flying',
      lastContact: NOW,
      telemetry: aTelemetry({ airborne: true, position: { eastM: 0, northM: 0 } }),
    })
    const b = aDroneState({
      id: 'b',
      name: 'B',
      status: 'Flying',
      lastContact: NOW,
      telemetry: aTelemetry({
        airborne: true,
        position: { eastM: SEPARATION_WARNING_M, northM: 0 },
      }),
    })
    expect(proximityPairs(vitalsFor(a, b), [a, b])).toHaveLength(0)
  })

  it('ignores parked Drones with no position conflict', () => {
    const a = aDroneState({
      id: 'a',
      name: 'A',
      status: 'Ready',
      lastContact: NOW,
      telemetry: aTelemetry({ airborne: false, position: { eastM: 0, northM: 0 } }),
    })
    const b = aDroneState({
      id: 'b',
      name: 'B',
      status: 'Ready',
      lastContact: NOW,
      telemetry: aTelemetry({ airborne: false, position: { eastM: 0.5, northM: 0 } }),
    })
    expect(proximityPairs(vitalsFor(a, b), [a, b])).toHaveLength(0)
  })
})

describe('proximityWallSummary', () => {
  it('counts close pairs', () => {
    const a = aDroneState({
      id: 'a',
      name: 'A',
      status: 'Flying',
      lastContact: NOW,
      telemetry: aTelemetry({ airborne: true, position: { eastM: 0, northM: 0 } }),
    })
    const b = aDroneState({
      id: 'b',
      name: 'B',
      status: 'Flying',
      lastContact: NOW,
      telemetry: aTelemetry({
        airborne: true,
        position: { eastM: 1, northM: 0 },
      }),
    })
    const pairs = proximityPairs(vitalsFor(a, b), [a, b])
    expect(proximityWallSummary(pairs)).toBe(1)
  })
})

describe('formatPairLabel', () => {
  it('joins callsigns with and', () => {
    expect(formatPairLabel('Drone 1', 'Drone 4')).toBe('Drone 1 and Drone 4')
  })
})

describe('formatSeparationReadout', () => {
  it('fixes one decimal and an apart suffix for alignment', () => {
    expect(formatSeparationReadout(1)).toBe('1.0 m apart')
  })
})

describe('pairLinkDroneId', () => {
  it('uses the lexicographically first drone id', () => {
    const pair = proximityPairs(
      vitalsFor(
        aDroneState({
          id: 'z',
          name: 'Z',
          status: 'Flying',
          lastContact: NOW,
          telemetry: aTelemetry({ airborne: true, position: { eastM: 0, northM: 0 } }),
        }),
        aDroneState({
          id: 'a',
          name: 'A',
          status: 'Flying',
          lastContact: NOW,
          telemetry: aTelemetry({
            airborne: true,
            position: { eastM: 1, northM: 0 },
          }),
        }),
      ),
      [
        aDroneState({
          id: 'z',
          name: 'Z',
          status: 'Flying',
          lastContact: NOW,
          telemetry: aTelemetry({ airborne: true, position: { eastM: 0, northM: 0 } }),
        }),
        aDroneState({
          id: 'a',
          name: 'A',
          status: 'Flying',
          lastContact: NOW,
          telemetry: aTelemetry({
            airborne: true,
            position: { eastM: 1, northM: 0 },
          }),
        }),
      ],
    )[0]!
    expect(pairLinkDroneId(pair)).toBe('a')
  })
})

describe('ProximityWall', () => {
  it('renders summary and all clear after the Fleet settles', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <WallsShell title="Proximity">
          <ProximityWall />
        </WallsShell>
      </FleetProvider>,
    )
    settle()

    expect(screen.getByRole('heading', { name: 'Proximity' })).toBeInTheDocument()
    expect(
      screen.getByText((_content, element) =>
        element?.tagName === 'P' ? /^\d+ close pairs$/.test(element.textContent ?? '') : false,
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('All clear.')).toBeInTheDocument()
  })

  it('shows a linked tile when two Drones are inside the warning distance', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ProximityWallWithScenarios />
      </FleetProvider>,
    )
    settle()

    act(() => {
      scenarios?.takeOff('ttf-0001')
      scenarios?.takeOff('ttf-0002')
      scenarios?.placeNear('ttf-0002', 'ttf-0001', SEPARATION_WARNING_M - 0.3)
    })
    act(() => {
      vi.advanceTimersByTime(1_000)
    })

    const link = screen.getByRole('link', { name: /Drone 1 and Drone 2/ })
    expect(link.getAttribute('href')).toMatch(/^\/drone\?id=/)
    const tile = link.closest('li')
    expect(tile).not.toBeNull()
    expect(tile).toHaveClass('border-status-not-ready')
    expect(within(tile as HTMLElement).getByText(/\d\.\d m apart/)).toHaveClass(
      'text-status-not-ready',
    )
  })
})
