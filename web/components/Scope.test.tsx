import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { aDroneState, aTelemetry } from '@techtechflight/contract/fixtures'
import type { DroneVitals } from '@/lib/vitals'
import { Scope, WINDOW_SIDES_M, cellsAcross, gridStepM, roomExtent } from './Scope'

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

const aVitals = (overrides: Partial<DroneVitals> = {}): DroneVitals => ({
  droneId: 'drone-1',
  callsign: 'Drone 1',
  status: 'Flying',
  phase: 'on-ground',
  airborne: false,
  altitudeM: null,
  verticalRateMps: null,
  batteryFraction: 0.6,
  enduranceMs: null,
  responseAgeMs: 1_000,
  position: { eastM: 0, northM: 0 },
  separationM: null,
  conflictWith: null,
  alerts: [],
  ...overrides,
})

/** The x of every vertical grid rule, in the order they are drawn. */
const verticalRules = (container: HTMLElement) =>
  [...container.querySelectorAll('line.stroke-hairline')]
    .filter((rule) => rule.getAttribute('x1') === rule.getAttribute('x2'))
    .map((rule) => rule.getAttribute('x1'))

/** Where each mark sits, as the inline percentages the HTML layer is positioned by. */
const markPositions = () =>
  screen.getAllByRole('button').map((mark) => `${mark.style.left} ${mark.style.top}`)

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

  it('takes the smallest rung that holds the Fleet, sized by its spread and not its distance away', () => {
    // 3 m of spread fits the smallest rung, wherever in the room it happens to be.
    expect(roomExtent([at('Drone 1', 0, 0), at('Drone 2', 3, 1)]).widthM).toBe(8)
    expect(roomExtent([at('Drone 1', 40, 40), at('Drone 2', 43, 41)]).widthM).toBe(8)

    // 14 m of spread does not: 8 and 12 are both too small, so 16 is the rung.
    expect(roomExtent([at('Drone 1', 0, 0), at('Drone 2', 14, 0)]).widthM).toBe(16)
  })

  /*
   * The lopsided picture. Centring on the setup point drew a Fleet that had been set up in a
   * corner into a corner of the frame, with half the picture empty.
   */
  it('centres on the middle of the Fleet, not on the setup point', () => {
    const room = roomExtent([at('Drone 1', 10, 4), at('Drone 2', 14, 8)])

    expect(room.window.centreEastM).toBe(12)
    expect(room.window.centreNorthM).toBe(6)
    expect(room.westM).toBe(8)
    expect(room.eastM).toBe(16)
  })

  /*
   * The centre is snapped to a whole cell, so the rules go on falling on the same metres
   * they always did. A window that has to move moves by whole cells, never by part of one.
   */
  it('snaps the centre to a whole cell', () => {
    // Midpoint of 0 and 3.4 is 1.7, which is not a multiple of the 0.5 m cell. 1.5 is.
    const room = roomExtent([at('Drone 1', 0, 0), at('Drone 2', 3.4, 0)])

    expect(room.window.centreEastM).toBe(1.5)
    // And so the frame's own edge lands on a cell boundary too.
    expect(Number.isInteger(room.westM / gridStepM(room.widthM))).toBe(true)
  })

  /*
   * The discipline the whole fix rests on. A centre that follows the Fleet is the original
   * bug wearing a different hat — the frame slides under the Drones and they read as still.
   */
  it('keeps the window exactly where it is while the Drones move inside it', () => {
    const held = { sideM: 8, centreEastM: 2, centreNorthM: 0 }

    expect(roomExtent([at('Drone 1', 1, 1), at('Drone 2', 3, -1)], held).window).toEqual(held)
    // Same Drones, moved: still the same window, not re-centred on where they went.
    expect(roomExtent([at('Drone 1', 4, 2), at('Drone 2', 5, 3)], held).window).toEqual(held)
  })

  /*
   * A Drone hovering on a rung boundary would otherwise flip the window between two sizes
   * on every Fleet State, which is the moving grid again in a subtler form.
   */
  it('grows the window and never shrinks it', () => {
    const held = { sideM: 16, centreEastM: 0, centreNorthM: 0 }

    // Everything would fit in 8 m now. The window stays where the Teacher last saw it.
    expect(roomExtent([at('Drone 1', 0, 0), at('Drone 2', 1, 1)], held).widthM).toBe(16)

    // A Drone leaves it, so it is reconsidered — and still may not come back down a rung.
    expect(roomExtent([at('Drone 1', 0, 0), at('Drone 2', 20, 0)], held).widthM).toBe(24)
  })

  /*
   * Past the last rung the window stops growing, and the only alternative to holding a Drone
   * on the edge is drawing it off the frame — where it reads as a Drone that is not flying.
   */
  it('holds a Drone beyond the largest window on its edge rather than losing it', () => {
    // 40 m apart is wider than the last rung, so the window centres between them and both
    // land on an edge — opposite edges, which is the honest picture of "further apart than
    // this can draw".
    const west = at('Drone 1', 0, 0)
    const east = at('Drone 2', 40, 0)
    const room = roomExtent([west, east])

    expect(room.widthM).toBe(32)
    expect(room.percentOf(west).xPercent).toBe(0)
    expect(room.percentOf(east).xPercent).toBe(100)
    expect(room.percentOf(east).yPercent).toBe(50)
    expect(room.beyond.map((drone) => drone.name)).toEqual(['Drone 1', 'Drone 2'])
  })

  it('holds nothing on the edge while the window can still grow to reach it', () => {
    const room = roomExtent([at('Drone 1', 0, 0), at('Drone 2', 11, 0)])

    expect(room.widthM).toBe(12)
    expect(room.beyond).toEqual([])
  })

  it('puts north at the top, because the y axis of an image grows the other way', () => {
    const room = roomExtent([at('Drone 1', 0, 0), at('Drone 2', 2, 4)])
    expect(room.project(0, 4).y).toBeLessThan(room.project(0, 0).y)
  })

  it('takes the smallest window for one Drone, and for none', () => {
    expect(roomExtent([]).widthM).toBe(8)
    expect(roomExtent([]).beyond).toEqual([])
    expect(roomExtent([at('Drone 1', 0, 0)]).widthM).toBe(8)
  })

  it('changes rung exactly at the boundary, and not before it', () => {
    // 8 m of spread is the exact width of the smallest window; a millimetre more is not.
    expect(roomExtent([at('Drone 1', -4, 0), at('Drone 2', 4, 0)]).widthM).toBe(8)
    expect(roomExtent([at('Drone 1', -4.001, 0), at('Drone 2', 4.001, 0)]).widthM).toBe(12)

    // The same at the last rung, where there is nothing above to grow into.
    expect(roomExtent([at('Drone 1', -16, 0), at('Drone 2', 16, 0)]).beyond).toEqual([])
    expect(
      roomExtent([at('Drone 1', -16.001, 0), at('Drone 2', 16.001, 0)]).beyond,
    ).toHaveLength(2)
  })
})

describe('the grid across two Fleet States', () => {
  /*
   * The bug this file exists to keep fixed, in the words it was reported in: "the squares
   * move, the dots should move". One assertion in three parts — the frame is identical, every
   * rule is identical, and the Drones are not. Two of the three would have passed before the
   * fix; holding all three at once is what says the grid has stopped drifting.
   *
   * jsdom reads SVG attributes and inline styles fine, so this one is genuinely testable
   * here — unlike the aspect ratio it sits beside.
   */
  it('holds the frame and every rule still while the Drones move', () => {
    const settled = [at('Drone 1', 0, 0), at('Drone 2', 2, 1)]
    const moved = [at('Drone 1', 1.5, -1), at('Drone 2', 3, 2.5)]

    const { container, rerender } = render(<Scope drones={settled} onSelect={() => {}} />)
    const viewBox = container.querySelector('svg')!.getAttribute('viewBox')
    const rules = verticalRules(container)
    const marks = markPositions()

    rerender(<Scope drones={moved} onSelect={() => {}} />)

    expect(rules.length).toBeGreaterThan(0)
    expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe(viewBox)
    expect(verticalRules(container)).toEqual(rules)
    expect(markPositions()).not.toEqual(marks)
  })

  /*
   * The window may grow, so the grid may legitimately change — once, visibly, and because a
   * Drone left the frame. What it may not do is change back, which is what a Drone hovering
   * on a rung boundary would otherwise make it do on every tick.
   */
  it('does not give the window back when the Drones close up again', () => {
    const spread = [at('Drone 1', 0, 0), at('Drone 2', 11, 0)]
    const closed = [at('Drone 1', 0, 0), at('Drone 2', 1, 0)]

    const { container, rerender } = render(<Scope drones={spread} onSelect={() => {}} />)
    expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 12 12')
    const rules = verticalRules(container)

    rerender(<Scope drones={closed} onSelect={() => {}} />)

    expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 12 12')
    expect(verticalRules(container)).toEqual(rules)
  })

  /*
   * The end-to-end statement of the original bug. A Drone that moves 1 m east in an 8 m
   * window must move exactly an eighth of the way across the picture. Before the fix the
   * frame moved east with it and the Drone barely shifted at all — the whole complaint.
   */
  it('moves a Drone across the picture by exactly as far as it moved in the room', () => {
    const before = [at('Drone 1', 0, 0), at('Drone 2', 2, 0)]
    const after = [at('Drone 1', 1, 0), at('Drone 2', 2, 0)]

    const { rerender } = render(<Scope drones={before} onSelect={() => {}} />)
    expect(screen.getByRole('button', { name: /Drone 1/ }).style.left).toBe('37.5%')

    rerender(<Scope drones={after} onSelect={() => {}} />)

    // 1 m of an 8 m window is 12.5% of it, and not a fraction less.
    expect(screen.getByRole('button', { name: /Drone 1/ }).style.left).toBe('50%')
    expect(screen.getByRole('button', { name: /Drone 2/ }).style.left).toBe('62.5%')
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
   *
   * The ladder is iterated rather than copied. Written out here, this would go on passing
   * over the five rungs it had been told about while a sixth quietly broke the rule. The two
   * numbers are written out on purpose: they are the rule, and a test that read them from the
   * code it is checking would assert nothing.
   */
  it('keeps cells across the window between 16 and 24, at every rung', () => {
    for (const sideM of WINDOW_SIDES_M) {
      expect(cellsAcross(sideM), `${sideM} m window`).toBeGreaterThanOrEqual(16)
      expect(cellsAcross(sideM), `${sideM} m window`).toBeLessThanOrEqual(24)
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
    // 14 m of spread takes the 16 m window, where half-metre cells would be 32 across.
    render(<Scope drones={[at('Drone 1', 0, 0), at('Drone 2', 14, 0)]} />)

    expect(screen.getByText('Grid: 1 m')).toBeInTheDocument()
  })

  it('names the Drones it had to hold on the edge, rather than dropping them silently', () => {
    render(<Scope drones={[at('Drone 1', 0, 0), at('Drone 2', 40, 0)]} />)

    expect(screen.getByText('Drone 2')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Drone 1 and Drone 2 are further out than the scope draws, held on the edge',
        { selector: 'span' },
      ),
    ).toBeInTheDocument()
  })

  /*
   * The label overlap, and the reason this is the piece that goes.
   *
   * Six labels in a short strip run into one unreadable line, and the phase is what makes
   * them do it — "On the ground" is three times the width of "Drone 4". Dropping it loses
   * nothing, because the same phase is on that Drone's flight strip further down the same
   * screen. The name has to survive at every width: a scope of anonymous dots does not
   * answer "which one is that", which is the only reason the scope is there.
   *
   * jsdom has no layout engine and applies no media query, so this is checked on the
   * utilities the markup carries rather than by measuring anything (CLAUDE.md).
   */
  it('drops the phase from a mark on a narrow screen, and never the Drone Name', () => {
    render(<Scope drones={[at('Drone 1', 0, 0)]} vitals={[aVitals()]} />)

    const phase = screen.getByText('On the ground')
    expect(phase.className).toContain('hidden')
    expect(phase.className).toContain('sm:block')

    const name = screen.getByText('Drone 1')
    expect(name.className).not.toContain('hidden')
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
