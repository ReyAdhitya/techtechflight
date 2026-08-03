import { afterEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SeparationThresholdPanel } from './SeparationThresholdPanel'
import {
  DEFAULT_SEPARATION_THRESHOLD_M,
  readSeparationThresholdM,
  SEPARATION_THRESHOLD_KEY,
} from '@/lib/separation-thresholds'

afterEach(() => {
  window.localStorage.removeItem(SEPARATION_THRESHOLD_KEY)
})

describe('separation threshold panel on Settings', () => {
  it('shows today\'s default and can save a new distance', async () => {
    const user = userEvent.setup()
    render(<SeparationThresholdPanel />)

    expect(screen.getByRole('heading', { name: 'Separation alarm' })).toBeInTheDocument()
    expect(screen.getByText(/Using 1\.5 m now/)).toBeInTheDocument()

    const input = screen.getByLabelText(/Warn below/i)
    await user.clear(input)
    await user.type(input, '2.5')
    await user.click(screen.getByRole('button', { name: 'Save distance' }))

    expect(readSeparationThresholdM()).toBe(2.5)
    expect(screen.getByText(/Using 2\.5 m now/)).toBeInTheDocument()
  })

  it('restores today\'s default from a tuned value', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(SEPARATION_THRESHOLD_KEY, '3')
    render(<SeparationThresholdPanel />)

    await user.click(screen.getByRole('button', { name: /Use today's default/i }))
    expect(readSeparationThresholdM()).toBe(DEFAULT_SEPARATION_THRESHOLD_M)
    expect(screen.getByText(/Back to today's default/)).toBeInTheDocument()
  })
})
