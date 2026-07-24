import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { aDroneState, aTelemetry } from '@techtechflight/contract/fixtures'
import { Scope, roomExtent } from './Scope'

/**
 * Where the Drones are, looking down on the room.
 *
 * The scope answers two questions and only two: *which one is that*, and *are two of them
 * about to meet*. Both are questions about distance, so the thing worth testing hardest is
 * that a distance on screen means a distance in the room — which is exactly what the
 * original did not do. It normalised east and north independently and then forced the
 * result into a 4:3 box, so a metre north and a metre east were different lengths.
 *
 * jsdom has no layout engine, so none of this is checked by looking. It is checked on the
 * projection itself, which is why `roomExtent` is exported.
 */

const at = (name: string, eastM: number, northM: number, airborne = true) =>
  aDroneState({
    id: name.toLowerCase().replace(' ', '-'),
    name,
    status: airborne ? 'Flying' : 'Ready',
    telemetry: aTelemetry({ airborne, position: { eastM, northM } }),
  })

describe('the room the scope draws', () => {
  /*
   * The bug, stated as arithmetic.
   *
   * A classroom Fleet sits in a wide, shallow strip — the simulator's is 7 m × 2 m. Under
   * independent normalisation a metre east became 100/7 units and a metre north 100/2, so
   * two Drones 0.9 m apart looked adjacent or dangerously close depending only on which
   * way round they were standing.
   */
  it('gives a metre the same length whichever way it is measured', () => {
    const wide = roomExtent([at('Drone 1', 0, 0), at('Drone 2', 7, 2)])

    // One unit of the viewBox is one metre, on both axes, so there is nothing to compare —
    // the projection cannot be anisotropic because it does not scale at all.
    expect(wide.project(1, 0).x - wide.project(0, 0).x).toBeCloseTo(1)
    expect(wide.project(0, 1).y - wide.project(0, 0).y).toBeCloseTo(-1)
  })

  it('shapes the box like the room rather than like a 4:3 photograph', () => {
    const wide = roomExtent([at('Drone 1', 0, 0), at('Drone 2', 7, 2)])
    // 7 m plus a metre of padding each side, by 2 m plus the same: 9 × 4.
    expect(wide.widthM).toBeCloseTo(9)
    expect(wide.heightM).toBeCloseTo(4)
    expect(wide.aspectRatio).toBeCloseTo(9 / 4)
  })

  it('never collapses to a zero-width room when everything is in a line', () => {
    const line = roomExtent([at('Drone 1', 0, 0), at('Drone 2', 4, 0)])
    expect(line.heightM).toBeGreaterThan(0)
    expect(Number.isFinite(line.aspectRatio)).toBe(true)
  })

  it('puts north at the top, because the y axis of an image grows the other way', () => {
    const room = roomExtent([at('Drone 1', 0, 0), at('Drone 2', 2, 4)])
    expect(room.project(0, 4).y).toBeLessThan(room.project(0, 0).y)
  })
})

describe('what the scope shows', () => {
  it('places every Drone that is in contact and reporting where it is', () => {
    render(<Scope drones={[at('Drone 1', 0, 0), at('Drone 2', 3, 1)]} />)

    expect(screen.getByText('Drone 1')).toBeInTheDocument()
    expect(screen.getByText('Drone 2')).toBeInTheDocument()
  })

  it('leaves out a Drone that is Offline, and one that has not said where it is', () => {
    render(
      <Scope
        drones={[
          at('Drone 1', 0, 0),
          aDroneState({ id: 'd2', name: 'Drone 2', status: 'Offline' }),
          aDroneState({ id: 'd3', name: 'Drone 3', telemetry: aTelemetry() }),
        ]}
      />,
    )

    expect(screen.getByText('Drone 1')).toBeInTheDocument()
    expect(screen.queryByText('Drone 2')).not.toBeInTheDocument()
    expect(screen.queryByText('Drone 3')).not.toBeInTheDocument()
  })

  it('says so plainly when nothing in contact is reporting a position', () => {
    render(<Scope drones={[aDroneState({ status: 'Offline' })]} />)

    expect(
      screen.getByText(/No Drone in contact is reporting where it is/i),
    ).toBeInTheDocument()
  })

  it('states the room size, so the picture can be read as a distance', () => {
    render(<Scope drones={[at('Drone 1', 0, 0), at('Drone 2', 7, 2)]} />)

    expect(screen.getByText(/9 m × 4 m/)).toBeInTheDocument()
  })

  /*
   * §11.3 of docs/DESIGN.md: every screen and every Drone reachable by keyboard. A mark
   * used to be a `<g>` with an onClick — a mouse-only control with no focus, no role and
   * no name, so the linked selection the scope exists for was unreachable without a
   * pointer.
   */
  it('makes each mark a real control when a Drone can be selected', () => {
    render(<Scope drones={[at('Drone 1', 0, 0), at('Drone 2', 3, 1)]} onSelect={() => {}} />)

    expect(screen.getByRole('button', { name: /Drone 1/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Drone 2/ })).toBeInTheDocument()
  })

  it('offers no control at all when there is nothing to select', () => {
    render(<Scope drones={[at('Drone 1', 0, 0)]} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
