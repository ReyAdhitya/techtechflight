import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { FleetProvider } from '@/components/FleetProvider'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { SpotlightWall } from './SpotlightWall'
import { WallsShell } from './WallsShell'

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

beforeEach(() => {
  pathname.current = '/demo'
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('SpotlightWall', () => {
  it('shows a large pane and switches focus from the thumbnail row', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <WallsShell title="Spotlight">
          <SpotlightWall />
        </WallsShell>
      </FleetProvider>,
    )
    settle()

    expect(screen.getByRole('heading', { name: 'Drone 1', level: 2 })).toBeInTheDocument()
    const thumbs = screen.getByRole('list', { name: 'Camera thumbnails' })
    fireEvent.click(screen.getByRole('button', { name: 'Drone 3' }))
    expect(screen.getByRole('heading', { name: 'Drone 3', level: 2 })).toBeInTheDocument()
    expect(thumbs).toBeInTheDocument()
  })
})
