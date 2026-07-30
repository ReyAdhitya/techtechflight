import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import { FleetProvider, useFleet } from '@/components/FleetProvider'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import type { ScenarioControls } from '@/lib/fleet-link'
import { StatusWall } from './StatusWall'
import { WallsShell } from './WallsShell'

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

let scenarios: ScenarioControls | null = null

function StatusWallWithScenarios() {
  scenarios = useFleet().scenarios
  return (
    <WallsShell title="Status">
      <StatusWall />
    </WallsShell>
  )
}

beforeEach(() => {
  pathname.current = '/demo'
  scenarios = null
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Status wall', () => {
  it('renders a linked tile per Drone in board order after the Fleet settles', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <StatusWallWithScenarios />
      </FleetProvider>,
    )
    settle()

    expect(screen.getByRole('heading', { name: 'Status' })).toBeInTheDocument()

    for (const name of ['Drone 1', 'Drone 2', 'Drone 3', 'Drone 4', 'Drone 5', 'Drone 6']) {
      const link = screen.getByRole('link', { name: new RegExp(name) })
      expect(link).toHaveAttribute('href', expect.stringMatching(/^\/drone\?id=ttf-/))
    }

    expect(screen.getAllByText(/\d+%/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Response/i).length).toBeGreaterThan(0)
  })

  it('shows fault styling on a tile when a Drone is faulted', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <StatusWallWithScenarios />
      </FleetProvider>,
    )
    settle()

    act(() => {
      scenarios?.injectFault('ttf-0002')
    })
    act(() => {
      vi.advanceTimersByTime(1_000)
    })

    const link = screen.getByRole('link', { name: /Drone 2/ })
    const tile = link.closest('li')
    expect(tile).not.toBeNull()
    expect(tile).toHaveClass('border-status-fault')
    expect(within(tile as HTMLElement).getByText('Fault')).toBeInTheDocument()
  })
})
