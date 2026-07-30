import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HeightCeilingBanner } from './HeightCeilingBanner'
import type { DroneVitals } from '@/lib/vitals'

const vitals = (id: string, altitudeM: number | null): DroneVitals =>
  ({
    droneId: id,
    callsign: id,
    altitudeM,
    airborne: altitudeM !== null && altitudeM > 0,
    alerts: [],
  }) as unknown as DroneVitals

describe('height ceiling banner on Control', () => {
  it('stays hidden when every Drone is at or below the ceiling', () => {
    const { container } = render(
      <HeightCeilingBanner vitals={[vitals('d1', 2.5), vitals('d2', 3)]} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('names craft above the classroom ceiling default', () => {
    render(<HeightCeilingBanner vitals={[vitals('d1', 3.4), vitals('d2', 1)]} />)
    expect(screen.getByRole('alert')).toHaveTextContent('above the 3 m ceiling')
    expect(screen.getByRole('alert')).toHaveTextContent('d1')
  })
})
