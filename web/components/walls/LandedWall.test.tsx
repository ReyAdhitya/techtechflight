import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import {
  aDroneState,
  aFleetState,
  aTelemetry,
} from '@techtechflight/contract/fixtures'
import type { DroneState } from '@techtechflight/contract'
import { FleetProvider, useFleet } from '@/components/FleetProvider'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { fleetVitals, type DroneVitals } from '@/lib/vitals'
import { LandedWall } from './LandedWall'
import { isLanded, landedBoardLabel, landedWallSummary } from './landed-wall'
import { WallsShell } from './WallsShell'

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const NOW = 1_000_000

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

let scenarios: ReturnType<typeof useFleet>['scenarios']

function LandedWallWithScenarios() {
  scenarios = useFleet().scenarios
  return <LandedWall />
}

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
  scenarios = null
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('isLanded', () => {
  it('is true when the airframe is not airborne', () => {
    const drone = aDroneState({
      status: 'Ready',
      lastContact: NOW,
      telemetry: aTelemetry({ airborne: false, altitudeM: 0 }),
    })
    expect(isLanded(vitalsFor(drone))).toBe(true)
  })

  it('is false when the airframe is still airborne', () => {
    const drone = aDroneState({
      status: 'Flying',
      lastContact: NOW,
      telemetry: aTelemetry({ airborne: true, altitudeM: 1.2 }),
    })
    expect(isLanded(vitalsFor(drone))).toBe(false)
  })

  it('reads airborne from telemetry, not Status alone', () => {
    const groundedFlyingStatus = aDroneState({
      status: 'Flying',
      lastContact: NOW,
      telemetry: aTelemetry({ airborne: false, altitudeM: 0 }),
    })
    expect(isLanded(vitalsFor(groundedFlyingStatus))).toBe(true)
  })
})

describe('landedBoardLabel', () => {
  it('maps airborne false to Landed and true to Still flying', () => {
    const landed = aDroneState({
      lastContact: NOW,
      telemetry: aTelemetry({ airborne: false }),
    })
    const flying = aDroneState({
      status: 'Flying',
      lastContact: NOW,
      telemetry: aTelemetry({ airborne: true }),
    })
    expect(landedBoardLabel(vitalsFor(landed))).toBe('Landed')
    expect(landedBoardLabel(vitalsFor(flying))).toBe('Still flying')
  })
})

describe('landedWallSummary', () => {
  it('counts landed and still-flying buckets', () => {
    expect(
      landedWallSummary([
        vitalsFor(
          aDroneState({ lastContact: NOW, telemetry: aTelemetry({ airborne: false }) }),
        ),
        vitalsFor(
          aDroneState({ lastContact: NOW, telemetry: aTelemetry({ airborne: false }) }),
        ),
        vitalsFor(
          aDroneState({
            status: 'Flying',
            lastContact: NOW,
            telemetry: aTelemetry({ airborne: true }),
          }),
        ),
      ]),
    ).toEqual({ landed: 2, stillFlying: 1 })
  })
})

describe('LandedWall', () => {
  it('renders summary and tiles linked to drone detail', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <WallsShell title="Landed">
          <LandedWall />
        </WallsShell>
      </FleetProvider>,
    )
    settle()

    expect(screen.getByRole('heading', { name: 'Landed' })).toBeInTheDocument()
    expect(
      screen.getByText((_content, element) =>
        element?.tagName === 'P'
          ? /^\d+ landed · \d+ still flying$/.test(element.textContent ?? '')
          : false,
      ),
    ).toBeInTheDocument()

    const links = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('/drone?id='))
    expect(links.length).toBeGreaterThan(0)
  })

  it('marks a still-flying tile after a Drone takes off', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <LandedWallWithScenarios />
      </FleetProvider>,
    )
    settle()

    act(() => {
      scenarios?.takeOff('ttf-0002')
    })
    act(() => {
      vi.advanceTimersByTime(2_000)
    })

    const flyingLink = screen.getByRole('link', { name: /Drone 2, Still flying/ })
    expect(flyingLink.closest('li')).toHaveAttribute('data-still-flying', 'true')
  })
})
