import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { ControlScreen } from './ControlScreen'
import { FleetProvider } from './FleetProvider'
import { ScenarioPanel } from './ScenarioPanel'

/**
 * Control keeps a single Attention bar — not a second full queue dock that shoved the
 * Scope down the page.
 */

const pathname = vi.hoisted(() => ({ current: '/demo' }))
// Control carries steps 6 to 11; this suite works the step that holds its subject.
const search = vi.hoisted(() => ({ current: new URLSearchParams('step=10') }))
vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
  useSearchParams: () => search.current,
}))

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

describe('Attention on Control', () => {
  it('shows the calm empty Attention bar when nothing needs you', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    expect(screen.queryByRole('navigation', { name: 'Attention queue' })).not.toBeInTheDocument()
    expect(screen.getByText('No items require action. All Drones in contact are nominal.')).toBeInTheDocument()
  })

  it('surfaces the worst alert on the Attention bar after a fault', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ScenarioPanel />
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    const faultButtons = screen.getAllByRole('button', { name: /^Fault$/ })
    fireEvent.click(faultButtons[5]!)
    settle()

    expect(screen.queryByRole('navigation', { name: 'Attention queue' })).not.toBeInTheDocument()
    expect(screen.getByRole('article')).toHaveTextContent('Drone 6')
    expect(screen.getByRole('list', { name: 'Items requiring action' })).toHaveTextContent('Drone 6')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/item requires action|items require action/)
  })
})
