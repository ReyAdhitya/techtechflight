import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { clearLogbook, readLogbook, upsertTrainerDrone } from '@/lib/logbook'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { FleetProvider } from './FleetProvider'
import { TrainerDronesPanel } from './TrainerDronesPanel'

/**
 * Trainer Drones on Settings (#80) — inventory is optional, not a mandatory form.
 */

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

const show = () =>
  render(
    <FleetProvider demonstration={PINNED_DEMONSTRATION}>
      <TrainerDronesPanel />
    </FleetProvider>,
  )

beforeEach(() => {
  clearLogbook()
  pathname.current = '/demo'
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Trainer Drones inventory', () => {
  it('keeps Model and Created behind Add details, and says they are optional', () => {
    show()
    settle()

    expect(screen.getByText(/Nothing here is required to teach/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Model \(optional\)/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Created \(optional\)/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: /Add details/i })[0]!)

    expect(screen.getByLabelText(/Model \(optional\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Created \(optional\)/i)).toBeInTheDocument()
    expect(screen.getByText(/leave blank if unused/i)).toBeInTheDocument()
  })

  it('saves cleared details without blocking teaching, and drops the empty row', () => {
    upsertTrainerDrone('ttf-0001', 'Classroom quad', '2026-01-15')
    show()
    settle()

    fireEvent.click(screen.getByRole('button', { name: /Edit details/i }))
    fireEvent.change(screen.getByLabelText(/Model \(optional\)/i), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText(/Created \(optional\)/i), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }))

    expect(readLogbook().trainerDrones).toEqual([])
  })

  it('shows a quiet summary when details already exist', () => {
    upsertTrainerDrone('ttf-0001', 'Classroom quad', '2026-01-15')
    show()
    settle()

    expect(screen.getByText(/Classroom quad · 2026-01-15/)).toBeInTheDocument()
    expect(screen.getAllByText('No details yet').length).toBeGreaterThan(0)
  })
})
