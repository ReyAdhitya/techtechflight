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
import type { ScenarioControls } from '@/lib/fleet-link'
import { HeightWall } from './HeightWall'
import {
  CLASSROOM_CEILING_M,
  formatHeightReadout,
  heightWallSummary,
  isOverCeiling,
} from './height-wall'
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

let scenarios: ScenarioControls | null = null

function HeightWallWithScenarios() {
  scenarios = useFleet().scenarios
  return (
    <WallsShell title="Height">
      <HeightWall />
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

describe('isOverCeiling', () => {
  it('is false at or below the classroom ceiling', () => {
    const atCeiling = aDroneState({
      lastContact: NOW,
      telemetry: aTelemetry({ airborne: true, altitudeM: CLASSROOM_CEILING_M }),
    })
    expect(isOverCeiling(vitalsFor(atCeiling))).toBe(false)

    const below = aDroneState({
      lastContact: NOW,
      telemetry: aTelemetry({ airborne: true, altitudeM: 1.2 }),
    })
    expect(isOverCeiling(vitalsFor(below))).toBe(false)
  })

  it('is true when height is above the classroom ceiling', () => {
    const high = aDroneState({
      lastContact: NOW,
      telemetry: aTelemetry({ airborne: true, altitudeM: CLASSROOM_CEILING_M + 0.1 }),
    })
    expect(isOverCeiling(vitalsFor(high))).toBe(true)
  })

  it('is false when height is not reported', () => {
    const noTelemetry = aDroneState({
      lastContact: null,
      telemetry: null,
    })
    expect(isOverCeiling(vitalsFor(noTelemetry))).toBe(false)
  })
})

describe('heightWallSummary', () => {
  it('counts only Drones above the ceiling', () => {
    const vitals = [
      vitalsFor(
        aDroneState({
          lastContact: NOW,
          telemetry: aTelemetry({ airborne: true, altitudeM: 1 }),
        }),
      ),
      vitalsFor(
        aDroneState({
          lastContact: NOW,
          telemetry: aTelemetry({ airborne: true, altitudeM: 3.5 }),
        }),
      ),
    ]
    expect(heightWallSummary(vitals)).toBe(1)
  })
})

describe('formatHeightReadout', () => {
  it('fixes one decimal and an m suffix for alignment', () => {
    expect(
      formatHeightReadout(
        vitalsFor(
          aDroneState({
            lastContact: NOW,
            telemetry: aTelemetry({ airborne: true, altitudeM: 2 }),
          }),
        ),
      ),
    ).toBe('2.0 m')
  })

  it('says so in words when height is not reported', () => {
    expect(
      formatHeightReadout(
        vitalsFor(aDroneState({ lastContact: null, telemetry: null })),
      ),
    ).toBe('Height not reported')
  })
})

describe('HeightWall', () => {
  it('renders summary and linked tiles after the Fleet settles', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <WallsShell title="Height">
          <HeightWall />
        </WallsShell>
      </FleetProvider>,
    )
    settle()

    expect(screen.getByRole('heading', { name: 'Height' })).toBeInTheDocument()
    expect(
      screen.getByText((_content, element) =>
        element?.tagName === 'P' ? /^\d+ over ceiling$/.test(element.textContent ?? '') : false,
      ),
    ).toBeInTheDocument()

    const links = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('/drone?id='))
    expect(links.length).toBeGreaterThan(0)
  })

  it('highlights a tile when a Drone is above the classroom ceiling', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <HeightWallWithScenarios />
      </FleetProvider>,
    )
    settle()

    act(() => {
      scenarios?.takeOff('ttf-0001')
      scenarios?.setAltitude('ttf-0001', CLASSROOM_CEILING_M + 0.5)
    })
    act(() => {
      vi.advanceTimersByTime(1_000)
    })

    const link = screen.getByRole('link', { name: /Drone 1/ })
    const tile = link.closest('li')
    expect(tile).not.toBeNull()
    expect(tile).toHaveClass('border-status-not-ready')
    expect(within(tile as HTMLElement).getByText('3.5 m')).toHaveClass('text-status-not-ready')
  })
})
