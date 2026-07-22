import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { FleetProvider, useFleet } from './FleetProvider'

/**
 * Which Fleet a screen is given, and how it is told.
 *
 * The provider is the only module in the product that knows whether a Fleet is simulated.
 * Everything downstream reads a FleetSnapshot and cannot tell, which is the point — so
 * what is worth testing here is that the demonstration path produces a Fleet that behaves
 * rather than a fixture, and that it still says plainly that it is one.
 */

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

function Probe() {
  const { snapshot, demo } = useFleet()
  return (
    <div>
      <span data-testid="demo">{String(demo)}</span>
      <span data-testid="connection">{snapshot.connection}</span>
      <span data-testid="drones">{snapshot.state?.drones.length ?? 0}</span>
      <span data-testid="contacted">
        {snapshot.state?.drones.filter((drone) => drone.status !== 'Offline').length ?? 0}
      </span>
    </div>
  )
}

const read = (id: string) => screen.getByTestId(id).textContent

beforeEach(() => {
  pathname.current = '/demo'
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the demonstration path', () => {
  it('says it is a demonstration', () => {
    render(
      <FleetProvider>
        <Probe />
      </FleetProvider>,
    )

    expect(read('demo')).toBe('true')
  })

  it('gives screens a Fleet with no ground station to reach', () => {
    render(
      <FleetProvider>
        <Probe />
      </FleetProvider>,
    )

    act(() => {
      vi.advanceTimersByTime(50)
    })

    expect(read('connection')).toBe('live')
    expect(read('drones')).toBe('6')
  })

  it('brings the Fleet into contact as Telemetry arrives, rather than starting complete', () => {
    render(
      <FleetProvider>
        <Probe />
      </FleetProvider>,
    )

    act(() => {
      vi.advanceTimersByTime(50)
    })
    // Nothing has reported yet, so every Drone is Offline — the honest starting state,
    // and one the hard-coded fixtures could never show.
    expect(read('contacted')).toBe('0')

    act(() => {
      vi.advanceTimersByTime(2_000)
    })

    expect(read('contacted')).toBe('6')
  })
})
