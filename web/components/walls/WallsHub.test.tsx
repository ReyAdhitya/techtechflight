import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { FleetProvider } from '@/components/FleetProvider'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { WallsHub, WALL_DESTINATIONS } from './WallsHub'
import { WallsShell } from './WallsShell'
import { WallPlaceholderTiles } from './WallPlaceholderTiles'

const pathname = vi.hoisted(() => ({ current: '/walls' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

beforeEach(() => {
  pathname.current = '/walls'
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Walls hub', () => {
  it('links to every landed sub-wall', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <WallsHub />
      </FleetProvider>,
    )

    expect(WALL_DESTINATIONS.map((w) => w.href)).toEqual([
      '/walls/cameras',
      '/walls/status',
      '/walls/ready',
      '/walls/battery',
      '/walls/attention',
      '/walls/faults',
      '/walls/heartbeat',
      '/walls/height',
      '/walls/proximity',
      '/walls/landing',
      '/walls/pads',
      '/walls/detect',
      '/walls/dual',
      '/walls/spotlight',
      '/walls/landed',
      '/walls/tv',
      '/walls/projector',
      '/walls/kiosk',
    ])
    for (const wall of WALL_DESTINATIONS) {
      expect(screen.getByRole('link', { name: new RegExp(wall.label) })).toHaveAttribute(
        'href',
        wall.href,
      )
    }
  })
})

describe('Walls shell subroute smoke', () => {
  it('renders placeholder tiles named from the fleet', () => {
    // Demonstration Fleet only boots on /demo (same as other FleetProvider tests).
    pathname.current = '/demo'
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <WallsShell title="Cameras">
          <WallPlaceholderTiles />
        </WallsShell>
      </FleetProvider>,
    )
    settle()

    expect(screen.getByRole('heading', { name: 'Cameras' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'All walls' })).toHaveAttribute('href', '/walls')
    expect(screen.getAllByText('Placeholder').length).toBeGreaterThan(0)
  })
})
