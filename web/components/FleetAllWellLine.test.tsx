import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FleetAllWellLine } from './FleetAllWellLine'

describe('FleetAllWellLine', () => {
  it('renders the calm sentence when nothing needs attention, with zero present', () => {
    render(
      <FleetAllWellLine
        drones={[{ status: 'Ready' }, { status: 'Flying' }, { status: 'Offline' }]}
      />,
    )
    const line = screen.getByRole('status')
    expect(line).toHaveTextContent('Everything is fine. 0 need attention')
    expect(line).toHaveAttribute('data-attention', '0')
  })

  it('still renders when the Fleet is empty — zero, not absent', () => {
    render(<FleetAllWellLine drones={[]} />)
    expect(screen.getByRole('status')).toHaveTextContent('0 need attention')
  })

  it('speaks the Needs Attention count when something is wrong', () => {
    render(
      <FleetAllWellLine drones={[{ status: 'Not Ready' }, { status: 'Fault' }]} />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('2 need attention')
  })
})
