import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { ControlScreen } from './ControlScreen'
import { FleetProvider } from './FleetProvider'

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

describe('peer demo spotlight on Control', () => {
  it('opens a spotlight region when Spotlight is pressed on a strip', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    fireEvent.click(screen.getAllByRole('button', { name: 'Spotlight' })[0]!)
    settle()

    const spotlight = screen.getByRole('region', { name: 'Peer demo spotlight' })
    expect(spotlight).toBeInTheDocument()
    expect(within(spotlight).getByRole('heading', { level: 2 })).toHaveTextContent('Drone 1')
  })
})
