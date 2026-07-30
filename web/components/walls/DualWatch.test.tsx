import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { FleetProvider } from '@/components/FleetProvider'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { DualWatch } from './DualWatch'
import { WallsShell } from './WallsShell'

const pathname = vi.hoisted(() => ({ current: '/demo' }))
const params = vi.hoisted(() => new URLSearchParams())
const replace = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
  useSearchParams: () => params,
  useRouter: () => ({ replace }),
}))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

beforeEach(() => {
  // /demo so FleetProvider runs the in-browser demonstration Fleet.
  pathname.current = '/demo'
  params.forEach((_, key) => params.delete(key))
  replace.mockReset()
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
    expect(screen.getByRole('combobox', { name: 'Left camera' })).toHaveDisplayValue('Drone 1')
    expect(screen.getByRole('combobox', { name: 'Right camera' })).toHaveDisplayValue('Drone 2')
  })

  it('writes the chosen Drone into ?a= / ?b= when the Teacher picks from a select', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <WallsShell title="Dual">
          <DualWatch />
        </WallsShell>
      </FleetProvider>,
    )
    settle()

    fireEvent.change(screen.getByRole('combobox', { name: 'Left camera' }), {
      target: { value: 'ttf-0003' },
    })

    expect(replace).toHaveBeenCalledWith('/demo?a=ttf-0003')
  })
})
