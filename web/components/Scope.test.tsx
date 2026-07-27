import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { aDroneState, aTelemetry } from '@techtechflight/contract/fixtures'
import { Scope, gridStepM, roomExtent } from './Scope'

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

  /*
   * The second bug, and the reason the cells were not square. The box used to take the
   * room's aspect ratio — which is to say, whatever shape the Fleet happened to be standing
   * in. A wide shallow strip of Drones drew a wide shallow box over a grid of metres.
   */
  it('draws a square window whatever shape the Fleet is standing in', () => {
    const wide = roomExtent([at('Drone 1', 0, 0), at('Drone 2', 7, 2)])

    expect(wide.widthM).toBe(wide.heightM)
    expect(wide.aspectRatio).toBe(1)
  })

  it('takes the smallest window on the ladder that holds every Drone, centred on the setup point', () => {
    // 3 m out needs 6 m of window, so the smallest rung holds it.
    const near = roomExtent([at('Drone 1', 0, 0), at('Drone 2', 3, 1)])
    expect(near.widthM).toBe(8)
    expect(near.westM).toBe(-4)
    expect(near.eastM).toBe(4)

    // 7 m out needs 14 m, so 12 m is too small and 16 m is the rung.
    expect(roomExtent([at('Drone 1', 0, 0), at('Drone 2', 7, 2)]).widthM).toBe(16)
  })

  /*
   * A Drone hovering on a rung boundary would otherwise flip the window between two sizes
   * on every Fleet State, which is the moving grid again in a subtler form.
   */
  it('grows the window and never shrinks it', () => {
    const held = roomExtent([at('Drone 1', 0, 0), at('Drone 2', 1, 1)], 16)
    expect(held.widthM).toBe(16)

    const grown = roomExtent([at('Drone 1', 0, 0), at('Drone 2', 11, 0)], 16)
    expect(grown.widthM).toBe(24)
  })

  it('never collapses to a zero-width room when everything is in a line', () => {
    const line = roomExtent([at('Drone 1', 0, 0), at('Drone 2', 4, 0)])
    expect(line.heightM).toBeGreaterThan(0)
    expect(Number.isFinite(line.aspectRatio)).toBe(true)
  })

  /*
   * Past the last rung the window stops growing, and the only alternative to holding a Drone
   * on the edge is drawing it off the frame — where it reads as a Drone that is not flying.
   */
  it('holds a Drone beyond the largest window on its edge rather than losing it', () => {
    const stray = at('Drone 2', 40, 0)
    const room = roomExtent([at('Drone 1', 0, 0), stray])

    expect(room.widthM).toBe(32)
    expect(room.percentOf(stray).xPercent).toBe(100)
    expect(room.percentOf(stray).yPercent).toBe(50)
    expect(room.beyond.map((drone) => drone.name)).toEqual(['Drone 2'])
  })

  it('holds nothing on the edge while the window can still grow to reach it', () => {
    const room = roomExtent([at('Drone 1', 0, 0), at('Drone 2', 11, 0)])

    expect(room.widthM).toBe(24)
    expect(room.beyond).toEqual([])
  })

  it('puts north at the top, because the y axis of an image grows the other way', () => {
    const room = roomExtent([at('Drone 1', 0, 0), at('Drone 2', 2, 4)])
    expect(room.project(0, 4).y).toBeLessThan(room.project(0, 0).y)
  })
})

describe('the grid the scope draws', () => {
  it('draws half-metre cells at the default window', () => {
    expect(gridStepM(8)).toBe(0.5)
  })

  /*
   * The step cannot stay at half a metre for every window — at 32 m that is 64 rules an axis
   * and the grid becomes a mesh — so it is tied to the window instead. The band is what keeps
   * it countable at both ends of the ladder.
   */
  it('keeps cells across the window between 16 and 24, at every rung', () => {
    for (const side of [8, 12, 16, 24, 32]) {
      const cells = side / gridStepM(side)
      expect(cells, `${side} m window`).toBeGreaterThanOrEqual(16)
      expect(cells, `${side} m window`).toBeLessThanOrEqual(24)
    }
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

  it('states the size of a cell, so the picture can be read as a distance', () => {
    // Nothing further than 3 m out, so the smallest window and its half-metre cells.
    render(<Scope drones={[at('Drone 1', 0, 0), at('Drone 2', 3, 1)]} />)

    expect(screen.getByText('Grid: 0.5 m')).toBeInTheDocument()
  })

  /*
   * The caption has to read the step off the window. Hard-coded, it would go on saying
   * "0.5 m" over metre cells the first time a Drone pushed the window up a rung — a scale
   * reference that lies is worse than none.
   */
  it('says the cell size the grid is actually drawn on, not the default one', () => {
    // 7 m out takes the 16 m window, where half-metre cells would be 32 across.
    render(<Scope drones={[at('Drone 1', 0, 0), at('Drone 2', 7, 2)]} />)

    expect(screen.getByText('Grid: 1 m')).toBeInTheDocument()
  })

  it('names a Drone it had to hold on the edge, rather than dropping it silently', () => {
    render(<Scope drones={[at('Drone 1', 0, 0), at('Drone 2', 40, 0)]} />)

    expect(screen.getByText('Drone 2')).toBeInTheDocument()
    expect(
      screen.getByText('Drone 2 is further out than the scope draws, held on the edge', {
        selector: 'span',
      }),
    ).toBeInTheDocument()
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
