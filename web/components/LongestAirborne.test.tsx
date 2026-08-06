import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LongestAirborne } from './LongestAirborne'

describe('LongestAirborne', () => {
  it('names the craft airborne longest with its duration', () => {
    const now = 1_000_000
    render(
      <LongestAirborne
        now={now}
        craft={[
          {
            droneId: 'a',
            callsign: 'Drone 1',
            airborne: true,
            airborneSince: now - 90_000,
          },
          {
            droneId: 'b',
            callsign: 'Drone 2',
            airborne: true,
            airborneSince: now - 180_000,
          },
        ]}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'Drone 2 has been up longest, 3:00',
    )
  })

  it('is silent when nobody is up with a known start', () => {
    const { container } = render(
      <LongestAirborne
        now={1_000_000}
        craft={[
          {
            droneId: 'a',
            callsign: 'Drone 1',
            airborne: false,
            airborneSince: null,
          },
        ]}
      />,
    )
    expect(container.firstChild).toBeNull()
  })
})
