import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { aDroneState } from '@techtechflight/contract/fixtures'
import { FleetHeadcountCheck } from './FleetHeadcountCheck'

function Harness() {
  const [presentIds, setPresentIds] = useState<ReadonlySet<string>>(() => new Set())
  const drones = [
    aDroneState({ id: 'a', name: 'Drone 1' }),
    aDroneState({ id: 'b', name: 'Drone 2' }),
    aDroneState({ id: 'c', name: 'Drone 3' }),
  ]
  return (
    <FleetHeadcountCheck
      drones={drones}
      presentIds={presentIds}
      onPresentIdsChange={setPresentIds}
    />
  )
}

describe('FleetHeadcountCheck', () => {
  it('shows the count at zero and lists every craft as missing', () => {
    render(<Harness />)
    expect(screen.getByRole('status')).toHaveTextContent('0 of 3 present')
    const missing = screen.getByLabelText('Missing craft')
    expect(missing).toHaveTextContent('Drone 1')
    expect(missing).toHaveTextContent('Drone 2')
    expect(missing).toHaveTextContent('Drone 3')
  })

  it('ticks a craft present and drops it from the missing list', () => {
    render(<Harness />)
    fireEvent.click(screen.getByLabelText(/Drone 2/))
    expect(screen.getByRole('status')).toHaveTextContent('1 of 3 present')
    const missing = screen.getByLabelText('Missing craft')
    expect(missing).toHaveTextContent('Drone 1')
    expect(missing).not.toHaveTextContent('Drone 2')
    expect(missing).toHaveTextContent('Drone 3')
  })
})
