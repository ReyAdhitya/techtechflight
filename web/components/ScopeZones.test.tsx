import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { aDroneState, aTelemetry } from '@techtechflight/contract/fixtures'
import { enclosesAnything, type Zone } from '@/lib/airspace'
import { Scope, scopeWindow, ScopeZones } from './Scope'

const at = (name: string, eastM: number, northM: number) =>
  aDroneState({
    id: name.toLowerCase().replace(' ', '-'),
    name,
    status: 'Flying',
    telemetry: aTelemetry({ airborne: true, position: { eastM, northM } }),
  })

const hallZone: Zone = {
  id: 'hall',
  kind: 'no-fly',
  name: 'the hall',
  points: [
    { eastM: 1, northM: 1 },
    { eastM: 6, northM: 1 },
    { eastM: 6, northM: 5 },
    { eastM: 1, northM: 5 },
  ],
}

const noFlyZone: Zone = {
  id: 'netting',
  kind: 'no-fly',
  name: 'the netting',
  points: [
    { eastM: 7, northM: 0 },
    { eastM: 9, northM: 0 },
    { eastM: 9, northM: 3 },
  ],
}

const drawingSvg = (container: HTMLElement) =>
  container.querySelector('svg[role="img"]') as SVGElement

describe('Scope zones overlay', () => {
  it('hatches every No-fly Zone on the top-down', () => {
    const { container } = render(
      <Scope drones={[at('Drone 1', 3, 3)]} zones={[hallZone, noFlyZone]} />,
    )

    // Two of them, and both hatched. There is no second kind to draw differently
    // (ADR-0027), so an outline that meant "you may fly here" would mean nothing.
    expect(container.querySelectorAll('[data-zone-kind="no-fly"]')).toHaveLength(2)

    const noFly = container.querySelector('[data-zone-kind="no-fly"]')
    expect(noFly).toBeInTheDocument()
    expect(noFly).toHaveAttribute('data-zone-hatched')
    expect(noFly?.getAttribute('fill')).toMatch(/^url\(#scope-no-fly-hatch-/)
    expect(noFly?.classList.contains('stroke-status-fault')).toBe(true)

    expect(container.querySelector('pattern[id^="scope-no-fly-hatch-"]')).toBeInTheDocument()
    expect(screen.queryByText('Outline = Mission Zone')).not.toBeInTheDocument()
    expect(screen.getByText('Hatched = No-fly Zone')).toBeInTheDocument()
  })

  /*
   * ADR-0029. A zone has no ceiling to invent, `breachesAt` has always ignored altitude, and
   * a Teacher watching Side used to see a Drone cross a zone with nothing on the picture to
   * say so while the strip beside it raised the breach.
   */
  it('draws a full-height band on Side and Front', () => {
    const { container } = render(
      <Scope drones={[at('Drone 1', 3, 3)]} zones={[hallZone, noFlyZone]} />,
    )

    for (const elevation of ['Side', 'Front']) {
      fireEvent.click(screen.getByRole('button', { name: elevation }))

      const bands = container.querySelectorAll('[data-zone-band]')
      expect(bands.length).toBeGreaterThan(0)
      for (const band of bands) {
        expect(band).toHaveAttribute('data-zone-hatched')
        // Floor to ceiling: the extent is the whole column of air, and always was.
        expect(band.getAttribute('y')).toBe('0')
        expect(Number(band.getAttribute('width'))).toBeGreaterThan(0)
        expect(Number(band.getAttribute('height'))).toBeGreaterThan(0)
      }
      expect(screen.getByText('Hatched band = No-fly Zone, floor to ceiling')).toBeInTheDocument()
    }
  })

  /*
   * The window is a square of space the display chose, not the room (ADR-0014). A zone
   * outside it has nowhere to be drawn on that axis, and a band held to zero width is not
   * drawn rather than smeared along the frame edge. What answers this is the Lesson screen
   * saying the zone is outside the window, not the picture pretending otherwise.
   */
  it('draws no band for a zone that falls outside the window on that axis', () => {
    // The netting runs 7 m to 9 m east; a window centred on a Drone at 3 m east ends at 7.
    const { container } = render(<Scope drones={[at('Drone 1', 3, 3)]} zones={[noFlyZone]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Side' }))
    expect(container.querySelectorAll('[data-zone-band]')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Front' }))
    expect(container.querySelectorAll('[data-zone-band]')).toHaveLength(0)
  })

  /* The polygon is the plan view's; an outline on an elevation would invent a top and a bottom. */
  it('draws a band rather than an outline on an elevation', () => {
    const { container } = render(<Scope drones={[at('Drone 1', 3, 3)]} zones={[hallZone]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Side' }))
    expect(container.querySelector('polygon[data-zone-kind="no-fly"]')).toBeNull()
  })

  it('skips zones that do not enclose anything yet', () => {
    const halfDrawn: Zone = { ...hallZone, points: hallZone.points.slice(0, 2) }
    expect(enclosesAnything(halfDrawn)).toBe(false)

    const { container } = render(
      <Scope drones={[at('Drone 1', 3, 3)]} zones={[halfDrawn, noFlyZone]} />,
    )

    // The half-drawn one is skipped; the finished one is still there.
    expect(container.querySelectorAll('[data-zone-kind="no-fly"]')).toHaveLength(1)
    expect(screen.getByText('Hatched = No-fly Zone')).toBeInTheDocument()
  })

  it('names the hardware caveat beside the zone keys', () => {
    render(
      <Scope
        drones={[at('Drone 1', 3, 3)]}
        zones={[hallZone]}
        zonesUnsurveyed
      />,
    )

    expect(screen.getByText('Not surveyed against this aircraft')).toBeInTheDocument()
  })

  it('does not claim zones are unsurveyed on the simulator', () => {
    render(<Scope drones={[at('Drone 1', 3, 3)]} zones={[hallZone]} />)

    expect(screen.queryByText('Not surveyed against this aircraft')).not.toBeInTheDocument()
  })
})

describe('ScopeZones', () => {
  it('projects zone corners through the scope window', () => {
    const scope = scopeWindow([at('Drone 1', 3, 3)])
    const { container } = render(
      <svg viewBox={`0 0 ${scope.widthM} ${scope.heightM}`}>
        <ScopeZones
          zones={[hallZone]}
          project={scope.project}
          view="top-down"
          noFlyHatchId="test-hatch"
        />
      </svg>,
    )

    const polygon = container.querySelector('[data-zone-kind="no-fly"]')
    expect(polygon?.getAttribute('points')).toMatch(/\d/)
  })
})

/**
 * Where a Drone took off, and where Recall would put it back.
 *
 * `home-point.ts` tracked this from the day it was written and printed it as words in two
 * places. Nothing drew it, on the one screen where it means something: Recall is one of only
 * five Commands that reach an aircraft, and a Teacher should be able to see where a Drone is
 * about to fly before pressing the button.
 */
describe('the starting point', () => {
  const airborne = at('Drone 1', 3, 3)
  const grounded = aDroneState({
    id: 'drone-2',
    name: 'Drone 2',
    status: 'Ready',
    telemetry: aTelemetry({ airborne: false, position: { eastM: 1, northM: 1 } }),
  })

  it('marks home under every Drone that has one, and lines the airborne ones to it', () => {
    const { container } = render(
      <Scope
        drones={[airborne, grounded]}
        homeOf={(droneId) => (droneId === 'drone-1' ? { eastM: 1, northM: 0 } : null)}
      />,
    )

    expect(container.querySelector('[data-home-mark="drone-1"]')).toBeInTheDocument()
    expect(container.querySelector('[data-home-line="drone-1"]')).toBeInTheDocument()
    // Dotted: not a path flown and not one being flown, but where Recall would send it.
    expect(
      container.querySelector('[data-home-line="drone-1"]')?.getAttribute('stroke-dasharray'),
    ).toBeTruthy()
    expect(screen.getByText(/where it took off, and where Recall sends it/)).toBeInTheDocument()
  })

  /* Absent is said by absence. A pair of noughts would be a launch point nobody promised. */
  it('draws nothing for a Drone the board never saw leave the ground', () => {
    const { container } = render(
      <Scope drones={[grounded]} homeOf={() => null} />,
    )

    expect(container.querySelector('[data-home-mark]')).toBeNull()
    expect(screen.queryByText(/where it took off/)).not.toBeInTheDocument()
  })

  it('draws no line from a Drone sitting on its own home', () => {
    const { container } = render(
      <Scope drones={[grounded]} homeOf={() => ({ eastM: 1, northM: 1 })} />,
    )

    expect(container.querySelector('[data-home-mark="drone-2"]')).toBeInTheDocument()
    expect(container.querySelector('[data-home-line="drone-2"]')).toBeNull()
  })

  /* Home is a place on the floor; on an elevation it says nothing about height. */
  it('stays off the elevation views', () => {
    const { container } = render(
      <Scope drones={[airborne]} homeOf={() => ({ eastM: 1, northM: 0 })} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Side' }))
    expect(container.querySelector('[data-scope-homes]')).toBeNull()
  })
})
