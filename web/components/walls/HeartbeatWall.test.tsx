import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import {
  aDroneState,
  aNoResponseDrone,
} from '@techtechflight/contract/fixtures'
import { FleetProvider, useFleet } from '@/components/FleetProvider'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import type { ScenarioControls } from '@/lib/fleet-link'
import { HeartbeatWall } from './HeartbeatWall'
import { heartbeatWallSummary, isHeartbeatAlive } from './heartbeat-wall'
import { WallsShell } from './WallsShell'

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

let scenarios: ScenarioControls | null = null

function HeartbeatWallWithScenarios() {
  scenarios = useFleet().scenarios
  return <HeartbeatWall />
}

beforeEach(() => {
  pathname.current = '/demo'
  scenarios = null
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('isHeartbeatAlive', () => {
  it('is true when the Drone has responded and Telemetry is current', () => {
    expect(isHeartbeatAlive(false, 1_000)).toBe(true)
  })

  it('is false when Telemetry is Stale or there has been no response', () => {
    expect(isHeartbeatAlive(true, 1_000)).toBe(false)
    expect(isHeartbeatAlive(false, null)).toBe(false)
    expect(isHeartbeatAlive(true, null)).toBe(false)
  })
})

describe('heartbeatWallSummary', () => {
  it('counts Drones that are not alive', () => {
    const drones = [
      aDroneState({ stale: false, lastContact: 1_000 }),
      aDroneState({ stale: true, lastContact: 900 }),
      aNoResponseDrone(),
    ]
    expect(heartbeatWallSummary(drones)).toBe(2)
  })
})

describe('HeartbeatWall', () => {
  it('renders alive and stale dots in board order, linked to drone detail', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <WallsShell title="Last Contact">
          <HeartbeatWall />
        </WallsShell>
      </FleetProvider>,
    )
    settle()

    expect(screen.getByRole('heading', { name: 'Last Contact' })).toBeInTheDocument()
    expect(
      screen.getByText((_content, element) =>
        element?.tagName === 'P' ? /^\d+ stale$/.test(element.textContent ?? '') : false,
      ),
    ).toBeInTheDocument()

    const names = ['Drone 1', 'Drone 2', 'Drone 3', 'Drone 4', 'Drone 5', 'Drone 6']
    for (const name of names) {
      const link = screen.getByRole('link', { name: new RegExp(name) })
      expect(link).toHaveAttribute('href', expect.stringMatching(/^\/drone\?id=ttf-/))
    }

    const aliveDots = document.querySelectorAll('[data-alive="true"]')
    expect(aliveDots.length).toBeGreaterThan(0)
  })

  it('marks a stale tile after a Drone falls silent', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <HeartbeatWallWithScenarios />
      </FleetProvider>,
    )
    settle()

    act(() => {
      scenarios?.loseLink('ttf-0002')
    })
    act(() => {
      vi.advanceTimersByTime(11_000)
    })

    const staleLink = screen.getByRole('link', { name: /Drone 2/ })
    expect(staleLink.closest('li')).toHaveAttribute('data-stale', 'true')
    expect(staleLink.querySelector('[data-alive]')).toBeNull()
  })
})
