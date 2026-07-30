import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { FleetProvider } from '@/components/FleetProvider'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { DualWatch } from './DualWatch'
import { WallsShell } from './WallsShell'

const pathname = vi.hoisted(() => ({ current: '/demo' }))
const params = vi.hoisted(() => new URLSearchParams())
vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
  useSearchParams: () => params,
}))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

beforeEach(() => {
  pathname.current = '/demo'
  params.forEach((_, key) => params.delete(key))
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('DualWatch', () => {
  it('shows two camera panes for the first two Fleet Drones by default', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <WallsShell title="Dual">
          <DualWatch />
        </WallsShell>
      </FleetProvider>,
    )
    settle()

    expect(screen.getByRole('heading', { name: 'Dual' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Drone 1', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Drone 2', level: 2 })).toBeInTheDocument()
  })
})
