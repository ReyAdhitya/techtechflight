import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import {
  aDroneState,
  aFleetState,
  aTelemetry,
} from '@techtechflight/contract/fixtures'
import type { DroneId, DroneState } from '@techtechflight/contract'
import { FleetProvider, useFleet } from '@/components/FleetProvider'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { fleetVitals, VERTICAL_DEADBAND_MPS, type DroneVitals } from '@/lib/vitals'
import { LandingWatch } from './LandingWatch'
import {
  formatAirborneReadout,
  formatLandingAltitude,
  isLandingRelated,
  landingWallEntries,
  landingWallFocused,
  landingWallSummary,
} from './landing-wall'
import { WallsShell } from './WallsShell'

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const NOW = 1_000_000

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

function vitalsFor(drone: DroneState, verticalRateMps: number | null = null): DroneVitals {
  const state = aFleetState([drone], NOW)
  const rates = new Map<DroneId, number | null>()
  if (verticalRateMps !== null) {
    rates.set(drone.id, verticalRateMps)
  }
  return fleetVitals({
    state,
    receivedAt: NOW,
    now: NOW,
    batteries: [],
    rates,
  })[0]!
}

let scenarios: ReturnType<typeof useFleet>['scenarios']
let command: ReturnType<typeof useFleet>['command']

function LandingWatchWithScenarios() {
  const fleet = useFleet()
  scenarios = fleet.scenarios
  command = fleet.command
  return (
    <WallsShell title="Landing">
      <LandingWatch />
    </WallsShell>
  )
}

beforeEach(() => {
  pathname.current = '/demo'
  scenarios = null
  command = null!
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('isLandingRelated', () => {
  it('is true for descending and auto-landing phases', () => {
    const descending = vitalsFor(
      aDroneState({
        lastContact: NOW,
        telemetry: aTelemetry({ airborne: true, altitudeM: 1.5 }),
      }),
      -VERTICAL_DEADBAND_MPS - 0.1,
    )
    expect(isLandingRelated(descending)).toBe(true)
    expect(descending.phase).toBe('descending')

    const autoLanding = vitalsFor(
      aDroneState({
        lastContact: NOW,
        telemetry: aTelemetry({ airborne: true, altitudeM: 1, autoLanding: 'in-progress' }),
      }),
    )
    expect(isLandingRelated(autoLanding)).toBe(true)
    expect(autoLanding.phase).toBe('auto-landing')
  })

  it('is false for grounded and level flight', () => {
    const grounded = vitalsFor(
      aDroneState({
        lastContact: NOW,
        telemetry: aTelemetry({ airborne: false, altitudeM: 0 }),
      }),
    )
    expect(isLandingRelated(grounded)).toBe(false)

    const level = vitalsFor(
      aDroneState({
        lastContact: NOW,
        telemetry: aTelemetry({ airborne: true, altitudeM: 2 }),
      }),
      0,
    )
    expect(isLandingRelated(level)).toBe(false)
  })
})

describe('landingWallEntries', () => {
  it('narrows to landing Drones when any are descending', () => {
    const ok = vitalsFor(
      aDroneState({
        id: 'a',
        name: 'Alpha',
        lastContact: NOW,
        telemetry: aTelemetry({ airborne: false, altitudeM: 0 }),
      }),
    )
    const landing = vitalsFor(
      aDroneState({
        id: 'b',
        name: 'Bravo',
        lastContact: NOW,
        telemetry: aTelemetry({ airborne: true, altitudeM: 1.2 }),
      }),
      -0.5,
    )
    expect(landingWallFocused([ok, landing])).toBe(true)
    expect(landingWallEntries([ok, landing]).map((entry) => entry.droneId)).toEqual(['b'])
    expect(landingWallSummary([ok, landing])).toBe(1)
  })

  it('keeps every Drone when none are landing', () => {
    const a = vitalsFor(
      aDroneState({
        id: 'a',
        lastContact: NOW,
        telemetry: aTelemetry({ airborne: false, altitudeM: 0 }),
      }),
    )
    const b = vitalsFor(
      aDroneState({
        id: 'b',
        lastContact: NOW,
        telemetry: aTelemetry({ airborne: true, altitudeM: 2 }),
      }),
      0,
    )
    expect(landingWallFocused([a, b])).toBe(false)
    expect(landingWallEntries([a, b])).toHaveLength(2)
    expect(landingWallSummary([a, b])).toBe(0)
  })
})

describe('formatAirborneReadout', () => {
  it('names airborne state in plain words', () => {
    expect(formatAirborneReadout(true)).toBe('Airborne')
    expect(formatAirborneReadout(false)).toBe('On the ground')
  })
})

describe('formatLandingAltitude', () => {
  it('fixes one decimal and an m suffix for alignment', () => {
    expect(
      formatLandingAltitude(
        vitalsFor(
          aDroneState({
            lastContact: NOW,
            telemetry: aTelemetry({ airborne: true, altitudeM: 1.25 }),
          }),
        ),
      ),
    ).toBe('1.3 m')
  })

  it('says so in words when height is not reported', () => {
    expect(
      formatLandingAltitude(vitalsFor(aDroneState({ lastContact: null, telemetry: null }))),
    ).toBe('Height not reported')
  })
})

describe('LandingWatch', () => {
  it('renders summary and linked tiles after the Fleet settles', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <WallsShell title="Landing">
          <LandingWatch />
        </WallsShell>
      </FleetProvider>,
    )
    settle()

    expect(screen.getByRole('heading', { name: 'Landing' })).toBeInTheDocument()
    expect(
      screen.getByText((_content, element) =>
        element?.tagName === 'P' ? /^\d+ landing$/.test(element.textContent ?? '') : false,
      ),
    ).toBeInTheDocument()

    const links = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('/drone?id='))
    expect(links.length).toBeGreaterThan(0)
  })

  it('shows every Drone with airborne and height when nothing is landing', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <LandingWatchWithScenarios />
      </FleetProvider>,
    )
    settle()

    for (const name of ['Drone 1', 'Drone 2', 'Drone 3', 'Drone 4', 'Drone 5', 'Drone 6']) {
      const link = screen.getByRole('link', { name: new RegExp(name) })
      expect(within(link).getByText(/On the ground|Airborne/)).toBeInTheDocument()
    }
  })

})
