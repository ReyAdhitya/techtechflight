import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { FleetProvider } from './FleetProvider'
import { TrainingScenariosPanel } from './TrainingScenariosPanel'

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

beforeEach(() => {
  pathname.current = '/demo'
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('training scenarios in Settings', () => {
  it('offers named Run controls and Reset, never as Commands', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <TrainingScenariosPanel />
      </FleetProvider>,
    )
    act(() => {
      vi.advanceTimersByTime(2_000)
    })

    expect(screen.getByRole('heading', { name: 'Training scenarios' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset classroom' })).toBeInTheDocument()
    expect(screen.getByText(/T1 · Separation conflict/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Run' }).length).toBeGreaterThan(5)
    expect(screen.getByText(/They are not Commands/i)).toBeInTheDocument()
  })
})
