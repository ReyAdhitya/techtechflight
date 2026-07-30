import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { assignStudent, clearLogbook, readLogbook, studentOf } from '@/lib/logbook'
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

describe('swap drone on Control strips', () => {
  it('offers Swap on other strips when one is selected', () => {
    assignStudent('ttf-0001', 'Priya')
    assignStudent('ttf-0002', 'Ravi')

    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    // Select via the strip (li), not the callsign link — the link goes to /drone.
    fireEvent.click(document.getElementById('control-strip-ttf-0001')!)

    expect(screen.getAllByRole('button', { name: 'Swap' }).length).toBeGreaterThan(0)
  })

  it('swaps assignments when Swap is pressed', () => {
    assignStudent('ttf-0001', 'Priya')
    assignStudent('ttf-0002', 'Ravi')

    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    fireEvent.click(document.getElementById('control-strip-ttf-0001')!)
    const stripTwo = document.getElementById('control-strip-ttf-0002')!
    fireEvent.click(within(stripTwo).getByRole('button', { name: 'Swap' }))

    const book = readLogbook()
    expect(studentOf(book, 'ttf-0001')).toBe('Ravi')
    expect(studentOf(book, 'ttf-0002')).toBe('Priya')
  })
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
})
