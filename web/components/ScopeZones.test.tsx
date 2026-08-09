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

  it('draws nothing on elevation views', () => {
    const { container } = render(
      <Scope drones={[at('Drone 1', 3, 3)]} zones={[hallZone, noFlyZone]} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Side' }))
    expect(container.querySelector('[data-scope-zones]')).toBeNull()
    expect(container.querySelector('[data-zone-kind="no-fly"]')).toBeNull()
    expect(screen.queryByText('Hatched = No-fly Zone')).not.toBeInTheDocument()
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
