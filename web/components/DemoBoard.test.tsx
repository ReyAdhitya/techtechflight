import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DemoBoard } from './DemoBoard'

describe('the Vercel demonstration board', () => {
  it('renders the Readyboard with clearly labelled sample Drones', () => {
    render(<DemoBoard />)

    expect(screen.getByRole('status', { name: /demonstration mode/i })).toHaveTextContent(
      /sample classroom data.*not live Drone telemetry/i,
    )
    /*
     * One of the six. The demonstration Fleet is composed to put every case the display
     * has to get right on screen at once — two Drones in the air, one flat, one with the
     * emergency stop held — which leaves exactly one a Teacher could hand out.
     */
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('1 of 6 ready')
    expect(screen.getAllByRole('article')).toHaveLength(6)
  })
})
