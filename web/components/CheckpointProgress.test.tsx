import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CheckpointProgress } from './CheckpointProgress'

describe('CheckpointProgress', () => {
  it('reads how many checkpoints are behind the craft', () => {
    render(<CheckpointProgress reached={2} required={4} />)
    expect(screen.getByRole('status')).toHaveTextContent('2 of 4 checkpoints')
  })

  it('counts up as checkpoints are reached', () => {
    const { rerender } = render(<CheckpointProgress reached={0} required={5} />)
    expect(screen.getByRole('status')).toHaveTextContent('0 of 5 checkpoints')

    rerender(<CheckpointProgress reached={3} required={5} />)
    expect(screen.getByRole('status')).toHaveTextContent('3 of 5 checkpoints')
  })

  it('says so in words when there are no checkpoints', () => {
    render(<CheckpointProgress reached={0} required={0} />)
    expect(screen.getByRole('status')).toHaveTextContent('No checkpoints')
  })
})
