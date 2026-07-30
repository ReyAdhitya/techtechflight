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
import { AttentionWall } from './AttentionWall'
import {
  attentionWallSummary,
  isAttentionWallTroubled,
} from './attention-wall'
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

let scenarios: ReturnType<typeof useFleet>['scenarios']

function AttentionWallWithScenarios() {
  scenarios = useFleet().scenarios
  return (
    <WallsShell title="Attention">
      <AttentionWall />
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

describe('isAttentionWallTroubled', () => {
  const neverAcknowledged = () => false

  it('is true for fault, emergency, stale, and unacknowledged alerts', () => {
    const fault = vitalsFor(
      aDroneState({
        status: 'Fault',
        lastContact: NOW,
        telemetry: aTelemetry({
          fault: { code: 'IMU', description: 'Motion sensor needs recalibrating' },
        }),
      }),
    )
    expect(isAttentionWallTroubled(fault, false, neverAcknowledged)).toBe(true)

    const emergency = vitalsFor(
      aDroneState({
        lastContact: NOW,
        telemetry: aTelemetry({ emergencyStopTriggered: true }),
      }),
    )
    expect(isAttentionWallTroubled(emergency, false, neverAcknowledged)).toBe(true)

    const calm = vitalsFor(
      aDroneState({
        status: 'Ready',
        lastContact: NOW,
        telemetry: aTelemetry({ airborne: false, batteryFraction: 0.9 }),
      }),
    )
    expect(isAttentionWallTroubled(calm, true, neverAcknowledged)).toBe(true)
    expect(isAttentionWallTroubled(calm, false, neverAcknowledged)).toBe(false)
  })
})

describe('attentionWallSummary', () => {
  it('counts only troubled Drones', () => {
    const ok = vitalsFor(
      aDroneState({
        id: 'a',
        status: 'Ready',
        lastContact: NOW,
        telemetry: aTelemetry({ batteryFraction: 0.9 }),
      }),
    )
    const fault = vitalsFor(
      aDroneState({
        id: 'b',
        status: 'Fault',
        lastContact: NOW,
        telemetry: aTelemetry({
          fault: { code: 'IMU', description: 'Motion sensor needs recalibrating' },
        }),
      }),
    )
    expect(attentionWallSummary([ok, fault], () => false, () => false)).toBe(1)
  })
})

describe('Attention wall', () => {
  it('renders a linked tile per Drone and a calm zero summary when nothing needs you', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <AttentionWallWithScenarios />
      </FleetProvider>,
    )
    settle()

    expect(screen.getByRole('heading', { name: 'Attention' })).toBeInTheDocument()
    expect(
      screen.getByText((_c, el) => Boolean(el?.tagName === 'P' && /0\s*need you/.test(el.textContent ?? ''))),
    ).toBeInTheDocument()

    for (const name of ['Drone 1', 'Drone 2', 'Drone 3', 'Drone 4', 'Drone 5', 'Drone 6']) {
      const link = screen.getByRole('link', { name: new RegExp(name) })
      expect(link).toHaveAttribute('href', expect.stringMatching(/^\/drone\?id=ttf-/))
    }
  })

  it('shows a large troubled tile when a Drone is faulted', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <AttentionWallWithScenarios />
      </FleetProvider>,
    )
    settle()

    act(() => {
      scenarios?.injectFault('ttf-0002')
    })
    act(() => {
      vi.advanceTimersByTime(1_000)
    })

    expect(
      screen.getByText((_c, el) => Boolean(el?.tagName === 'P' && /1\s*needs you/.test(el.textContent ?? ''))),
    ).toBeInTheDocument()

    const link = screen.getByRole('link', { name: /Drone 2/ })
    const tile = link.closest('li')
    expect(tile).not.toBeNull()
    expect(tile).toHaveAttribute('data-troubled', 'true')
    expect(tile?.className).toMatch(/border-status-fault/)
  })

  it('keeps nominal Drones muted when another needs you', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <AttentionWallWithScenarios />
      </FleetProvider>,
    )
    settle()

    act(() => {
      scenarios?.injectFault('ttf-0002')
    })
    act(() => {
      vi.advanceTimersByTime(1_000)
    })

    const okLink = screen.getByRole('link', { name: /^Drone 1$/ })
    const okTile = okLink.closest('li')
    expect(okTile).not.toHaveAttribute('data-troubled')
    expect(within(okLink).getByText('Drone 1').className).toMatch(/text-ink-muted/)
  })
})
