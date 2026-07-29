import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConnectionBanner } from './ConnectionBanner'

describe('the ground station connection banner', () => {
  it('tells a Teacher how to start :4321 when the board cannot reach it', () => {
    render(<ConnectionBanner connection="unreachable" />)

    expect(screen.getByText(/cannot reach the ground station/)).toBeInTheDocument()
    expect(screen.getByText(/Start TechTech Flight\.bat/)).toBeInTheDocument()
    expect(screen.getByText(/4321/)).toBeInTheDocument()
  })

  it('stays quiet while connecting, without the launcher copy', () => {
    render(<ConnectionBanner connection="connecting" />)

    expect(screen.getByText(/Connecting to the ground station/)).toBeInTheDocument()
    expect(screen.queryByText(/Start TechTech Flight\.bat/)).not.toBeInTheDocument()
  })
})
