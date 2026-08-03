import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { aDroneState } from '@techtechflight/contract/fixtures'
import { FleetReadyCountdown } from './FleetReadyCountdown'

describe('FleetReadyCountdown', () => {
  it('renders the fleet charge-to-ready line from observed forecasts', () => {
    render(
      <FleetReadyCountdown
        drones={[
          aDroneState({ id: 'a', status: 'Ready' }),
          aDroneState({ id: 'b', status: 'Ready' }),
          aDroneState({ id: 'c', status: 'Ready' }),
          aDroneState({ id: 'd', status: 'Ready' }),
          aDroneState({
            id: 'e',
            status: 'Not Ready',
            timeToReadyMs: 8 * 60_000,
          }),
          aDroneState({
            id: 'f',
            status: 'Not Ready',
            timeToReadyMs: 12 * 60_000,
          }),
        ]}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('6 ready in 12 minutes')
  })

  it('says nothing when no honest forecast exists', () => {
    const { container } = render(
      <FleetReadyCountdown
        drones={[
          aDroneState({ status: 'Ready' }),
          aDroneState({ id: '2', status: 'Not Ready', timeToReadyMs: null }),
        ]}
      />,
    )
    expect(container.firstChild).toBeNull()
  })
})
