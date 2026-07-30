import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { assignStudent, clearLogbook } from '@/lib/logbook'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { ControlScreen } from './ControlScreen'
import { FleetProvider } from './FleetProvider'

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

beforeEach(() => {
  pathname.current = '/demo'
  vi.useFakeTimers()
  clearLogbook()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('student name on flight strips', () => {
  it('shows the assigned name prominently beside the callsign', () => {
    assignStudent('ttf-0001', 'Priya')

    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    const name = screen.getByRole('button', { name: /Who is flying Drone 1: Priya/i })
    expect(name).toHaveClass('font-display')
    expect(name).toHaveClass('text-body')
    expect(name).toHaveClass('font-medium')
    expect(name).toHaveClass('text-ink')
  })

  it('opens the name field when the prominent label is clicked', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    assignStudent('ttf-0001', 'Priya')

    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    await act(async () => {
      vi.advanceTimersByTime(2_000)
    })

    await user.click(screen.getByRole('button', { name: /Who is flying Drone 1: Priya/i }))

    expect(screen.getByDisplayValue('Priya')).toBeInTheDocument()
  })
})
