import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
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
  it('lists every wall in one grid with a search field', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <WallsHub />
      </FleetProvider>,
    )

    expect(screen.queryByText('More walls')).not.toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Find a wall' })).toBeInTheDocument()
    expect(WALL_DESTINATIONS.map((w) => w.href)).toEqual([
      '/walls/cameras',
      '/walls/status',
      '/walls/ready',
      '/walls/battery',
      '/walls/attention',
      '/walls/height',
      '/walls/faults',
      '/walls/heartbeat',
      '/walls/proximity',
      '/walls/landing',
      '/walls/pads',
      '/walls/detect',
      '/walls/dual',
      '/walls/landed',
    ])
    for (const wall of WALL_DESTINATIONS) {
      expect(document.querySelector(`a[href="${wall.href}"]`)).not.toBeNull()
    }
  })

  it('filters walls by search text', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <WallsHub />
      </FleetProvider>,
    )

    fireEvent.change(screen.getByRole('searchbox', { name: 'Find a wall' }), {
      target: { value: 'battery' },
    })

    expect(document.querySelector('a[href="/walls/battery"]')).not.toBeNull()
    expect(document.querySelector('a[href="/walls/cameras"]')).toBeNull()
  })
})

describe('Walls shell subroute smoke', () => {
  it('renders placeholder tiles named from the fleet', () => {
    pathname.current = '/demo'
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <WallsShell title="Cameras">
          <WallPlaceholderTiles />
        </WallsShell>
      </FleetProvider>,
    )
    settle()
    expect(screen.getByText('Cameras')).toBeInTheDocument()
  })
})
