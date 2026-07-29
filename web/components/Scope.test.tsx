import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { aDroneState, aTelemetry } from '@techtechflight/contract/fixtures'
import { Scope, WINDOW_SIDES_M, cellsAcross, gridStepM, scopeWindow } from './Scope'

/**
 * Where the Drones are, looking down.
 *
 * The scope answers two questions and only two: *which one is that*, and *are two of them
 * about to meet*. Both are questions about distance, so the thing worth testing hardest is
 * that a distance on screen means a distance between two Drones — which is exactly what the
 * original did not do. It normalised east and north independently and then forced the
 * result into a 4:3 box, so a metre north and a metre east were different lengths.
 *
 * jsdom has no layout engine, so none of this is checked by looking. It is checked on the
 * projection itself, which is why `scopeWindow` is exported.
 */

const at = (name: string, eastM: number, northM: number, airborne = true) =>
  aDroneState({
    id: name.toLowerCase().replace(' ', '-'),
    name,
    status: airborne ? 'Flying' : 'Ready',
    telemetry: aTelemetry({ airborne, position: { eastM, northM } }),
  })

/**
 * The same Drone, with a stated height.
 *
 * `altitudeM` is optional on `Telemetry` and the absence is load-bearing: it means the
 * airframe cannot measure height at all, which is a different fact from being on the floor.
 * Passed explicitly here so a test that means "no barometer" cannot be read as an oversight.
 *
 * The key is left off rather than set to `undefined`, because `exactOptionalPropertyTypes`
 * is on and the two are not the same thing to this codebase — which is the distinction the
 * tests below exist to protect, so the fixture had better honour it too.
 */
const atHeight = (name: string, eastM: number, northM: number, altitudeM: number | undefined) =>
  aDroneState({
    id: name.toLowerCase().replace(' ', '-'),
    name,
    status: 'Flying',
    telemetry: aTelemetry({
      airborne: true,
      position: { eastM, northM },
      ...(altitudeM === undefined ? {} : { altitudeM }),
    }),
  })

/** The x of every vertical grid rule, in the order they are drawn. */
const verticalRules = (container: HTMLElement) =>
  [...container.querySelectorAll('line.stroke-hairline')]
    .filter((rule) => rule.getAttribute('x1') === rule.getAttribute('x2'))
    .map((rule) => rule.getAttribute('x1'))

const drawingSvg = (container: HTMLElement) =>
  container.querySelector('svg[role="img"]') as SVGElement

/** Where each mark sits, as the inline percentages the HTML layer is positioned by. */
const markPositions = () =>
  screen
    .getAllByRole('button')
    .filter((button) => button.style.left !== '')
    .map((mark) => `${mark.style.left} ${mark.style.top}`)

describe('the window the scope draws', () => {
  /*
   * The bug, stated as arithmetic.
   *
   * A classroom Fleet sits in a wide, shallow strip — the simulator's is 7 m × 2 m. Under
   * independent normalisation a metre east became 100/7 units and a metre north 100/2, so
   * two Drones 0.9 m apart looked adjacent or dangerously close depending only on which
   * way round they were standing.
   */
  it('gives a metre the same length whichever way it is measured', () => {
    const wide = scopeWindow([at('Drone 1', 0, 0), at('Drone 2', 7, 2)])

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
    const wide = scopeWindow([at('Drone 1', 0, 0), at('Drone 2', 7, 2)])

    expect(wide.widthM).toBe(wide.heightM)
    expect(wide.aspectRatio).toBe(1)
  })

  it('takes the smallest rung that holds the Fleet, sized by its spread and not its distance away', () => {
    // 3 m of spread fits the smallest rung, wherever in the room it happens to be.
    expect(scopeWindow([at('Drone 1', 0, 0), at('Drone 2', 3, 1)]).widthM).toBe(8)
    expect(scopeWindow([at('Drone 1', 40, 40), at('Drone 2', 43, 41)]).widthM).toBe(8)

    // 14 m of spread does not: 8 and 12 are both too small, so 16 is the rung.
    expect(scopeWindow([at('Drone 1', 0, 0), at('Drone 2', 14, 0)]).widthM).toBe(16)
  })

  /*
   * The lopsided picture. Centring on the setup point drew a Fleet that had been set up in a
   * corner into a corner of the frame, with half the picture empty.
   */
  it('centres on the middle of the Fleet, not on the setup point', () => {
    const scope = scopeWindow([at('Drone 1', 10, 4), at('Drone 2', 14, 8)])

    expect(scope.choice.centreEastM).toBe(12)
    expect(scope.choice.centreNorthM).toBe(6)
    expect(scope.westM).toBe(8)
    expect(scope.eastM).toBe(16)
  })

  /*
   * The centre is snapped to a whole cell, so the rules go on falling on the same metres
   * they always did. A window that has to move moves by whole cells, never by part of one.
   */
  it('snaps the centre to a whole cell', () => {
    // Midpoint of 0 and 3.4 is 1.7, which is not a multiple of the 0.5 m cell. 1.5 is.
    const scope = scopeWindow([at('Drone 1', 0, 0), at('Drone 2', 3.4, 0)])

    expect(scope.choice.centreEastM).toBe(1.5)
    // And so the frame's own edge lands on a cell boundary too.
    expect(Number.isInteger(scope.westM / gridStepM(scope.widthM))).toBe(true)
  })

  /*
   * The discipline the whole fix rests on. A centre that follows the Fleet is the original
   * bug wearing a different hat — the frame slides under the Drones and they read as still.
   */
  it('keeps the window exactly where it is while the Drones move inside it', () => {
    const held = { sideM: 8, centreEastM: 2, centreNorthM: 0 }

    expect(scopeWindow([at('Drone 1', 1, 1), at('Drone 2', 3, -1)], held).choice).toEqual(held)
    // Same Drones, moved: still the same window, not re-centred on where they went.
    expect(scopeWindow([at('Drone 1', 4, 2), at('Drone 2', 5, 3)], held).choice).toEqual(held)
  })

  /*
   * A Drone hovering on a rung boundary would otherwise flip the window between two sizes
   * on every Fleet State, which is the moving grid again in a subtler form.
   */
  it('grows the window and never shrinks it', () => {
    const held = { sideM: 16, centreEastM: 0, centreNorthM: 0 }

    // Everything would fit in 8 m now. The window stays where the Teacher last saw it.
    expect(scopeWindow([at('Drone 1', 0, 0), at('Drone 2', 1, 1)], held).widthM).toBe(16)

    // A Drone leaves it, so it is reconsidered — and still may not come back down a rung.
    expect(scopeWindow([at('Drone 1', 0, 0), at('Drone 2', 20, 0)], held).widthM).toBe(24)
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
    const scope = scopeWindow([west, east])

    expect(scope.widthM).toBe(32)
    expect(scope.percentOf(west).xPercent).toBe(0)
    expect(scope.percentOf(east).xPercent).toBe(100)
    expect(scope.percentOf(east).yPercent).toBe(50)
    expect(scope.beyond.map((drone) => drone.name)).toEqual(['Drone 1', 'Drone 2'])
  })

  it('holds nothing on the edge while the window can still grow to reach it', () => {
    const scope = scopeWindow([at('Drone 1', 0, 0), at('Drone 2', 11, 0)])

    expect(scope.widthM).toBe(12)
    expect(scope.beyond).toEqual([])
  })

  it('puts north at the top, because the y axis of an image grows the other way', () => {
    const scope = scopeWindow([at('Drone 1', 0, 0), at('Drone 2', 2, 4)])
    expect(scope.project(0, 4).y).toBeLessThan(scope.project(0, 0).y)
  })

  it('takes the smallest window for one Drone, and for none', () => {
    expect(scopeWindow([]).widthM).toBe(8)
    expect(scopeWindow([]).beyond).toEqual([])
    expect(scopeWindow([at('Drone 1', 0, 0)]).widthM).toBe(8)
  })

  it('changes rung exactly at the boundary, and not before it', () => {
    // 8 m of spread is the exact width of the smallest window; a millimetre more is not.
    expect(scopeWindow([at('Drone 1', -4, 0), at('Drone 2', 4, 0)]).widthM).toBe(8)
    expect(scopeWindow([at('Drone 1', -4.001, 0), at('Drone 2', 4.001, 0)]).widthM).toBe(12)

    // The same at the last rung, where there is nothing above to grow into.
    expect(scopeWindow([at('Drone 1', -16, 0), at('Drone 2', 16, 0)]).beyond).toEqual([])
    expect(
      scopeWindow([at('Drone 1', -16.001, 0), at('Drone 2', 16.001, 0)]).beyond,
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
    const viewBox = drawingSvg(container).getAttribute('viewBox')
    const rules = verticalRules(container)
    const marks = markPositions()

    rerender(<Scope drones={moved} onSelect={() => {}} />)

    expect(rules.length).toBeGreaterThan(0)
    expect(drawingSvg(container).getAttribute('viewBox')).toBe(viewBox)
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
    expect(drawingSvg(container).getAttribute('viewBox')).toBe('0 0 12 12')
    const rules = verticalRules(container)

    rerender(<Scope drones={closed} onSelect={() => {}} />)

    expect(drawingSvg(container).getAttribute('viewBox')).toBe('0 0 12 12')
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

  /*
   * The caption used to state the cell size. It read as a claim about what a cell measured on
   * the glass, and every monitor is a different size, so on screen it could never be true.
   *
   * The grid itself is untouched — the tests above still pin the window, the snapping and the
   * 16-to-24 band. Only the sentence about it went.
   */
  it('claims no size for the grid it draws', () => {
    render(<Scope drones={[at('Drone 1', 0, 0), at('Drone 2', 3, 1)]} />)

    expect(screen.queryByText(/Grid:/)).not.toBeInTheDocument()
  })

  it('keeps the keys to the symbols, which claim nothing about size', () => {
    render(<Scope drones={[at('Drone 1', 0, 0), at('Drone 2', 3, 1)]} />)

    expect(screen.getByText('Filled = flying')).toBeInTheDocument()
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

  it('writes the height under the Drone Name, to one decimal', () => {
    render(<Scope drones={[atHeight('Drone 1', 0, 0, 1.74)]} />)

    expect(screen.getByText('1.7 m')).toBeInTheDocument()
  })

  /*
   * The distinction `docs/DESIGN.md` §11.1 exists to protect. An airframe with no barometer
   * and one sitting on the floor are different facts, and drawing them the same way tells a
   * Teacher the second when the truth is the first.
   */
  it('writes nothing at all for a Drone that cannot measure its height', () => {
    render(<Scope drones={[atHeight('Drone 1', 0, 0, undefined)]} />)

    expect(screen.getByText('Drone 1')).toBeInTheDocument()
    expect(screen.queryByText(/^-?\d+\.\d m$/)).not.toBeInTheDocument()
    expect(screen.queryByText('0.0 m')).not.toBeInTheDocument()
  })

  it('writes 0.0 m for a Drone that can measure its height and is on the floor', () => {
    render(<Scope drones={[atHeight('Drone 1', 0, 0, 0)]} />)

    expect(screen.getByText('0.0 m')).toBeInTheDocument()
  })

  /*
   * The label overlap, and the reason the second line is the piece that goes.
   *
   * Six labels in a short strip run into one unreadable line, and the second line is what
   * makes them do it. The name has to survive at every width: a scope of anonymous dots does
   * not answer "which one is that", which is the only reason the scope is there.
   *
   * jsdom has no layout engine and applies no media query, so this is checked on the
   * utilities the markup carries rather than by measuring anything (CLAUDE.md).
   */
  it('drops the height from a mark on a narrow screen, and never the Drone Name', () => {
    render(<Scope drones={[atHeight('Drone 1', 0, 0, 1.5)]} />)

    const height = screen.getByText('1.5 m')
    expect(height.className).toContain('hidden')
    expect(height.className).toContain('sm:block')

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

  it('offers no control on a mark when there is nothing to select', () => {
    render(<Scope drones={[at('Drone 1', 0, 0)]} />)

    expect(screen.queryByRole('button', { name: /Drone 1/ })).not.toBeInTheDocument()
    // The view toggle is a control whatever happens; it is not a mark.
    expect(screen.getByRole('button', { name: 'Top-down' })).toBeInTheDocument()
  })
})

/**
 * The side view, and the one thing it must not do.
 *
 * The scope answers *which one is that* and *are two about to meet*, in plan. It cannot
 * answer **are those two at the same height** — two marks a hand's width apart on the
 * top-down may be three metres apart vertically and in no danger at all.
 *
 * The hazard is the same one `scopeWindow` was written against: a vertical axis stretched to
 * fill the box would make two Drones look well separated when they are not. So the box takes
 * the shape of what it draws, and a metre up is the same length as a metre across.
 */
const showSide = () => fireEvent.click(screen.getByRole('button', { name: 'Side' }))
const showFront = () => fireEvent.click(screen.getByRole('button', { name: 'Front' }))

const box = (container: HTMLElement) =>
  container.querySelector('[style*="aspect-ratio"]') as HTMLElement

describe('the side view', () => {
  it('starts on the top-down, and does not remember being left on the side', () => {
    const drones = [atHeight('Drone 1', 0, 0, 1)]
    const first = render(<Scope drones={drones} />)

    expect(screen.getByRole('button', { name: 'Top-down' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    showSide()
    expect(screen.getByRole('button', { name: 'Side' })).toHaveAttribute('aria-pressed', 'true')

    // A Teacher who left it on Side should not find it there with a class walking in.
    first.unmount()
    render(<Scope drones={drones} />)
    expect(screen.getByRole('button', { name: 'Top-down' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  /*
   * The acceptance item, and the reason the box reshapes rather than staying square: equal
   * scale on both axes comes from the viewBox and the box agreeing about their proportions.
   */
  it('gives a metre up the same length as a metre across', () => {
    const { container } = render(<Scope drones={[atHeight('Drone 1', 0, 0, 1.5)]} />)
    showSide()

    // 8 m window, and 1.5 m of altitude takes the 2 m rung.
    expect(drawingSvg(container).getAttribute('viewBox')).toBe('0 0 8 2')
    expect(box(container).style.aspectRatio).toBe('8 / 2')
  })

  it('takes the smallest ceiling that holds every Drone, and never gives it back', () => {
    const { container, rerender } = render(<Scope drones={[atHeight('Drone 1', 0, 0, 1)]} />)
    showSide()
    expect(drawingSvg(container).getAttribute('viewBox')).toBe('0 0 8 2')

    rerender(<Scope drones={[atHeight('Drone 1', 0, 0, 3)]} />)
    expect(drawingSvg(container).getAttribute('viewBox')).toBe('0 0 8 4')

    // Back down again: the ceiling holds, exactly as the window does.
    rerender(<Scope drones={[atHeight('Drone 1', 0, 0, 1)]} />)
    expect(drawingSvg(container).getAttribute('viewBox')).toBe('0 0 8 4')
  })

  it('puts a Drone on the ground line when it reports being on the ground', () => {
    render(<Scope drones={[atHeight('Drone 1', 0, 0, 0)]} onSelect={() => {}} />)
    showSide()

    expect(screen.getByRole('button', { name: /Drone 1/ }).style.top).toBe('100%')
  })

  /*
   * The distinction that matters most here. Putting a Drone with no barometer on the ground
   * line would state it is landed, when the truth is that it cannot say.
   */
  it('leaves out a Drone that cannot report a height, and names it', () => {
    render(
      <Scope
        drones={[atHeight('Drone 1', 0, 0, 1), atHeight('Drone 2', 2, 0, undefined)]}
        onSelect={() => {}}
      />,
    )
    showSide()

    expect(screen.queryByRole('button', { name: /Drone 2/ })).not.toBeInTheDocument()
    expect(
      screen.getByText('Drone 2 does not report a height', { selector: 'span' }),
    ).toBeInTheDocument()
    // And it is still on the top-down, where height is not what is being drawn.
    fireEvent.click(screen.getByRole('button', { name: 'Top-down' }))
    expect(screen.getByRole('button', { name: /Drone 2/ })).toBeInTheDocument()
  })

  /*
   * Swapping only tells a Teacher anything if Front agrees with top-down about left-to-right
   * (both are east). Side reads north instead.
   */
  it('places a Drone on Front at the same horizontal as the top-down', () => {
    render(<Scope drones={[atHeight('Drone 1', 3, 1, 1)]} onSelect={() => {}} />)

    const across = screen.getByRole('button', { name: /Drone 1/ }).style.left
    showFront()

    expect(screen.getByRole('button', { name: /Drone 1/ }).style.left).toBe(across)
  })

  /*
   * Out of scope, and recorded here so it reads as a decision. Both lines encode a horizontal
   * distance; how that reads against a difference in height is a separate question, and a
   * line between two marks in the side view would look like it had been answered.
   */
  it('draws no conflict or link line from the side', () => {
    const linked = (name: string, eastM: number) =>
      aDroneState({
        id: name.toLowerCase().replace(' ', '-'),
        name,
        status: 'Flying',
        telemetry: aTelemetry({
          airborne: true,
          position: { eastM, northM: 0 },
          altitudeM: 1,
          linkGroupId: 'formation',
        }),
      })

    const { container } = render(<Scope drones={[linked('Drone 1', 0), linked('Drone 2', 2)]} />)
    expect(container.querySelectorAll('line.stroke-status-not-ready').length).toBe(1)

    showSide()
    expect(container.querySelectorAll('line.stroke-status-not-ready').length).toBe(0)
  })
})

describe('the front view', () => {
  it('offers three viewpoints, with Front reachable from Top-down', () => {
    render(<Scope drones={[atHeight('Drone 1', 0, 0, 1)]} />)

    expect(screen.getByRole('button', { name: 'Top-down' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Side' })).toBeInTheDocument()
    showFront()
    expect(screen.getByRole('button', { name: 'Front' })).toHaveAttribute('aria-pressed', 'true')
  })

  /*
   * Front's horizontal is east — the classroom row. Side's is north. Same east / different
   * north therefore stacks on Front and separates on Side (swapped from the first Front ADR).
   */
  it('spreads the classroom row on Front; Side stacks same-north craft', () => {
    render(
      <Scope
        drones={[atHeight('Drone 1', 0, 0, 1.5), atHeight('Drone 2', 3, 0, 1.5)]}
        onSelect={() => {}}
      />,
    )

    showFront()
    const frontLeft = {
      a: screen.getByRole('button', { name: /Drone 1/ }).style.left,
      b: screen.getByRole('button', { name: /Drone 2/ }).style.left,
    }
    expect(frontLeft.a).not.toBe(frontLeft.b)

    showSide()
    const sideLeft = {
      a: screen.getByRole('button', { name: /Drone 1/ }).style.left,
      b: screen.getByRole('button', { name: /Drone 2/ }).style.left,
    }
    expect(sideLeft.a).toBe(sideLeft.b)
  })

  it('separates on Side when only north differs; Front stacks them', () => {
    render(
      <Scope
        drones={[atHeight('Drone 1', 1, 0, 1.5), atHeight('Drone 2', 1, 3, 1.5)]}
        onSelect={() => {}}
      />,
    )

    showSide()
    expect(screen.getByRole('button', { name: /Drone 1/ }).style.left).not.toBe(
      screen.getByRole('button', { name: /Drone 2/ }).style.left,
    )

    showFront()
    expect(screen.getByRole('button', { name: /Drone 1/ }).style.left).toBe(
      screen.getByRole('button', { name: /Drone 2/ }).style.left,
    )
  })

  it('matches Side on equal metre scale and ceiling shape', () => {
    const { container } = render(<Scope drones={[atHeight('Drone 1', 0, 0, 1.5)]} />)
    showFront()

    expect(drawingSvg(container).getAttribute('viewBox')).toBe('0 0 8 2')
    expect(box(container).style.aspectRatio).toBe('8 / 2')
  })

  it('leaves out a heightless Drone and names it, like Side', () => {
    render(
      <Scope
        drones={[atHeight('Drone 1', 0, 0, 1), atHeight('Drone 2', 0, 2, undefined)]}
        onSelect={() => {}}
      />,
    )
    showFront()

    expect(screen.queryByRole('button', { name: /Drone 2/ })).not.toBeInTheDocument()
    expect(
      screen.getByText('Drone 2 does not report a height', { selector: 'span' }),
    ).toBeInTheDocument()
  })

  it('draws no conflict or link line from the front', () => {
    const linked = (name: string, northM: number) =>
      aDroneState({
        id: name.toLowerCase().replace(' ', '-'),
        name,
        status: 'Flying',
        telemetry: aTelemetry({
          airborne: true,
          position: { eastM: 0, northM },
          altitudeM: 1,
          linkGroupId: 'formation',
        }),
      })

    const { container } = render(<Scope drones={[linked('Drone 1', 0), linked('Drone 2', 2)]} />)
    expect(container.querySelectorAll('line.stroke-status-not-ready').length).toBe(1)

    showFront()
    expect(container.querySelectorAll('line.stroke-status-not-ready').length).toBe(0)
  })
})

describe('the scope caption', () => {
  /*
   * A key to a symbol that is not in the picture sends a Teacher looking for something that is
   * not there. The side view draws no ties and no conflict lines, so it offers no key to them.
   */
  it('keys only the symbols the showing view actually draws', () => {
    const linked = (name: string, eastM: number) =>
      aDroneState({
        id: name.toLowerCase().replace(' ', '-'),
        name,
        status: 'Flying',
        telemetry: aTelemetry({
          airborne: true,
          position: { eastM, northM: 0 },
          altitudeM: 1,
          linkGroupId: 'formation',
        }),
      })

    render(<Scope drones={[linked('Drone 1', 0), linked('Drone 2', 2)]} />)
    expect(screen.getByText('Dashed = linked as one group')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Side' }))
    expect(screen.queryByText('Dashed = linked as one group')).not.toBeInTheDocument()
    // "Filled = flying" is true of a mark in either view, so it stays.
    expect(screen.getByText('Filled = flying')).toBeInTheDocument()
  })
})

describe('full screen on the scope', () => {
  it('expands into an overlay and restores on Exit or Escape', () => {
    const { container } = render(<Scope drones={[atHeight('Drone 1', 0, 0, 1)]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }))
    const dialog = screen.getByRole('dialog', { name: 'Scope full screen' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Exit full screen' })).toBeInTheDocument()
    // Picture block stays centred in the free space — not stuck under the toggles.
    expect(dialog.querySelector('.justify-center')).not.toBeNull()
    expect(dialog.querySelector('.items-center')).not.toBeNull()

    // View toggle still works inside the overlay.
    fireEvent.click(screen.getByRole('button', { name: 'Side' }))
    expect(screen.getByRole('button', { name: 'Side' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Scope full screen' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Full screen' })).toBeInTheDocument()
    expect(container.querySelector('[aria-label="Full screen"]')).not.toBeNull()
  })

  it('does not remember being left expanded', () => {
    const drones = [atHeight('Drone 1', 0, 0, 1)]
    const first = render(<Scope drones={drones} />)
    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }))
    first.unmount()
    render(<Scope drones={drones} />)
    expect(screen.queryByRole('dialog', { name: 'Scope full screen' })).not.toBeInTheDocument()
  })

  it('shows the selected-drone panel only while expanded and a mark is chosen', () => {
    render(
      <Scope
        drones={[atHeight('Drone 1', 0, 0, 1), atHeight('Drone 2', 3, 1, 1)]}
        selected="drone-1"
        onSelect={() => {}}
        selectedPanel={<div>Land Hover Stop for selected</div>}
      />,
    )

    expect(screen.queryByText('Land Hover Stop for selected')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }))
    expect(screen.getByText('Land Hover Stop for selected')).toBeInTheDocument()
  })
})
