import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import { FleetProvider } from '@/components/FleetProvider'
import { assignStudent, clearLogbook } from '@/lib/logbook'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { AssignmentWall } from './AssignmentWall'
import { WallsShell } from './WallsShell'

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

beforeEach(() => {
  pathname.current = '/demo'
  clearLogbook()
  vi.useFakeTimers()
})

afterEach(() => {
  clearLogbook()
  vi.useRealTimers()
})

describe('AssignmentWall', () => {
  it('shows Student names large beside craft in board order', () => {
    assignStudent('ttf-0001', 'Priya')
    assignStudent('ttf-0002', 'Ravi')

    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <WallsShell title="Assignments">
          <AssignmentWall />
        </WallsShell>
      </FleetProvider>,
    )
    settle()

    expect(screen.getByRole('heading', { name: 'Assignments' })).toBeInTheDocument()
    expect(
      screen.getByText((_, element) => element?.textContent === '2 of 6 assigned'),
    ).toBeInTheDocument()

    const tiles = screen.getAllByRole('listitem')
    expect(within(tiles[0]!).getByText('Priya')).toHaveClass('text-heading')
    expect(within(tiles[0]!).getByText('Drone 1')).toBeInTheDocument()
    expect(within(tiles[1]!).getByText('Ravi')).toBeInTheDocument()
    expect(within(tiles[2]!).getByText('Unassigned')).toBeInTheDocument()
  })

  it('keeps the assigned count at zero when nobody has a craft', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <WallsShell title="Assignments">
          <AssignmentWall />
        </WallsShell>
      </FleetProvider>,
    )
    settle()

    expect(
      screen.getByText((_, element) => element?.textContent === '0 of 6 assigned'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Unassigned').length).toBe(6)
  })
})
