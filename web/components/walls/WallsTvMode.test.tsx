import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { FleetProvider } from '@/components/FleetProvider'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { WallsTvMode } from './WallsTvMode'

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

beforeEach(() => {
  pathname.current = '/demo'
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

describe('WallsTvMode', () => {
  it('toggles between Cameras and Status', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <WallsTvMode />
      </FleetProvider>,
    )
    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(screen.getByRole('heading', { name: 'TV' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Status' }))
    expect(screen.getByRole('button', { name: 'Status' })).toHaveAttribute('aria-pressed', 'true')
  })
})
