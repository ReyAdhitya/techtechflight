import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { writeClassroomFleetSize } from '@/lib/classroom-fleet-size'
import { FleetConnection } from '@/lib/fleet-connection'
import { FleetProvider, useFleet } from './FleetProvider'
import { SimulationLabel } from './SimulationLabel'

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
  const { snapshot, demo, vitals } = useFleet()
  return (
    <div>
      <span data-testid="demo">{String(demo)}</span>
      <span data-testid="connection">{snapshot.connection}</span>
      <span data-testid="drones">{snapshot.state?.drones.length ?? 0}</span>
      <span data-testid="contacted">
        {snapshot.state?.drones.filter((drone) => drone.status !== 'Offline').length ?? 0}
      </span>
      <span data-testid="rate">{String(vitals[0]?.verticalRateMps)}</span>
    </div>
  )
}

/** A screen a Teacher can navigate away from and back to, with the layout staying put. */
function Screen({ showing }: { showing: boolean }) {
  return (
    <FleetProvider demonstration={PINNED_DEMONSTRATION}>
      {showing ? <Probe /> : <span data-testid="elsewhere">another screen</span>}
    </FleetProvider>
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
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <Probe />
      </FleetProvider>,
    )

    expect(read('demo')).toBe('true')
  })

  it('gives screens a Fleet with no ground station to reach', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
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
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
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

describe('saying which Fleet this is', () => {
  it('says so in words wherever a simulated Fleet is on screen', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <SimulationLabel />
      </FleetProvider>,
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      /Simulated Fleet. No aircraft are being contacted/i,
    )
  })

  it('says nothing at all when the Fleet is real', () => {
    pathname.current = '/'
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <SimulationLabel />
      </FleetProvider>,
    )

    // Absent rather than reworded. A label that is always there stops being read, and
    // this one only means something when it is unusual.
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

/**
 * What the board has watched happen, across a Teacher changing screen.
 *
 * A vertical rate does not exist in any single Fleet State — it only appears once several
 * altitude readings have been remembered, and the same is true of how long an Alert has
 * been waiting. Both were kept on the tower screen, so glancing at another screen and
 * coming back threw them away and started counting again, in the middle of a lesson.
 */
describe('what the board remembers between screens', () => {
  it('still knows how a Drone is moving after a Teacher goes elsewhere and returns', () => {
    const { rerender } = render(<Screen showing />)

    /*
     * All at once, on purpose. Several Fleet States arriving inside one batch used to
     * collapse into a single reading and no rate was ever derived; the tracker subscribes
     * to the link now, so it sees every one of them however React groups the renders.
     */
    act(() => {
      vi.advanceTimersByTime(4_000)
    })
    // Enough readings have accumulated for a rate to exist at all.
    expect(read('rate')).not.toBe('null')
    const before = read('rate')

    // Away to another screen, and back. The layout holding the connection never unmounts.
    rerender(<Screen showing={false} />)
    expect(screen.getByTestId('elsewhere')).toBeInTheDocument()
    rerender(<Screen showing />)

    // Available immediately, rather than absent until several more readings arrive.
    expect(read('rate')).toBe(before)
  })
})

/**
 * A Student tab on a DEMO_ONLY preview is not a second classroom.
 *
 * Two FleetProviders used to start two Simulators. The Teacher had Telemetry; the tablet
 * said Drone 1 was not reporting. The classroom is the ground station on :4321. Tests that
 * pass `demonstration` still get a Fleet, because they are asserting what the screen says
 * when one is there.
 */
describe('a Student tab on a developer preview', () => {
  beforeEach(() => {
    pathname.current = '/student'
    process.env.NEXT_PUBLIC_DEMO_ONLY = '1'
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_DEMO_ONLY
    pathname.current = '/demo'
  })

  it('does not start a second Simulator', () => {
    render(
      <FleetProvider>
        <Probe />
      </FleetProvider>,
    )

    act(() => {
      vi.advanceTimersByTime(50)
    })

    expect(read('connection')).toBe('unreachable')
    expect(read('drones')).toBe('0')
  })

  it('still gives a test a Fleet when it asks for one', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <Probe />
      </FleetProvider>,
    )

    act(() => {
      vi.advanceTimersByTime(50)
    })

    expect(read('connection')).toBe('live')
    expect(read('drones')).toBe('6')
  })
})

/**
 * Opening Fleet or Walls mid-lesson must be the same connection as step 7.
 *
 * The classroom Fleet size hydrates from a default. Putting that number on the ground-station
 * link rebuilt it and read as six Offline / lost link.
 */
describe('the ground-station connection through a lesson', () => {
  beforeEach(() => {
    pathname.current = '/'
    delete process.env.NEXT_PUBLIC_DEMO_ONLY
  })

  afterEach(() => {
    pathname.current = '/demo'
  })

  it('does not reconnect when the classroom Fleet size hydrates', () => {
    const start = vi.spyOn(FleetConnection.prototype, 'start')
    render(
      <FleetProvider>
        <Probe />
      </FleetProvider>,
    )

    const opened = start.mock.calls.length
    expect(opened).toBeGreaterThan(0)

    act(() => {
      writeClassroomFleetSize(12)
    })

    expect(start.mock.calls.length).toBe(opened)
    start.mockRestore()
  })
})
