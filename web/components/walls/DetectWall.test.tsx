import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { FleetProvider } from '@/components/FleetProvider'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { DetectWall } from './DetectWall'
import { WallsShell } from './WallsShell'

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

beforeEach(() => {
  pathname.current = '/demo'
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

describe('DetectWall', () => {
  it('renders detection placeholders for each Fleet Drone', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <WallsShell title="Detect">
          <DetectWall />
        </WallsShell>
      </FleetProvider>,
    )
    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(screen.getByRole('heading', { name: 'Detect' })).toBeInTheDocument()
    expect(screen.getAllByRole('link').filter((l) => l.getAttribute('href')?.startsWith('/drone?id=')).length).toBeGreaterThan(
      0,
    )
  })
})
