import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AltitudeFloorNotice } from './AltitudeFloorNotice'
import type { DroneVitals } from '@/lib/vitals'

const vitals = (
  id: string,
  altitudeM: number | null,
  airborne = altitudeM !== null && altitudeM > 0,
): DroneVitals =>
  ({
    droneId: id,
    callsign: id,
    altitudeM,
    airborne,
    alerts: [],
  }) as unknown as DroneVitals

describe('altitude floor notice on Control', () => {
  it('stays hidden when every airborne craft is at or above the floor', () => {
    const { container } = render(
      <AltitudeFloorNotice
        vitals={[vitals('d1', 0.5), vitals('d2', 1.2), vitals('d3', 0, false)]}
        floorM={0.5}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('names craft below the floor and tells the Teacher what to do', () => {
    render(
      <AltitudeFloorNotice vitals={[vitals('Drone 1', 0.2), vitals('Drone 2', 1)]} floorM={0.5} />,
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('below 0.5 m over the desks')
    expect(alert).toHaveTextContent('Drone 1')
    expect(alert).toHaveTextContent('Bring them up')
    expect(alert).not.toHaveTextContent('Drone 2')
  })

  it('does not warn a grounded craft sitting on a desk', () => {
    const { container } = render(
      <AltitudeFloorNotice vitals={[vitals('Drone 1', 0.1, false)]} floorM={0.5} />,
    )
    expect(container.firstChild).toBeNull()
  })
})
