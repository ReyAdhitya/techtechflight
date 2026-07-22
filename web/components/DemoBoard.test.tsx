import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DemoBoard } from './DemoBoard'

describe('the Vercel demonstration board', () => {
  it('renders the Readyboard with clearly labelled sample Drones', () => {
    render(<DemoBoard />)

    expect(screen.getByRole('status', { name: /demonstration mode/i })).toHaveTextContent(
      /sample classroom data.*not live Drone telemetry/i,
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('2 of 6 ready')
    expect(screen.getAllByRole('article')).toHaveLength(6)
  })
})
