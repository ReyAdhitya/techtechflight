import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { FleetProvider } from '@/components/FleetProvider'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { PadWall } from './PadWall'
import { WallsShell } from './WallsShell'

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

beforeEach(() => {
  pathname.current = '/demo'
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

describe('PadWall', () => {
  it('shows Not seen for each settled Fleet Drone', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <WallsShell title="Pads">
          <PadWall />
        </WallsShell>
      </FleetProvider>,
    )
    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(screen.getByRole('heading', { name: 'Pads' })).toBeInTheDocument()
    expect(screen.getAllByText(/Not seen|—|Seen/).length).toBeGreaterThan(0)
  })
})
