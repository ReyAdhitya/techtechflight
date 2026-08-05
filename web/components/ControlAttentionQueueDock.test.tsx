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
  search.current = new URLSearchParams('step=10')
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
    // The step is the h1 now, so the count is the h2 under it rather than a second h1.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Work the Alert at the top')
    expect(screen.getByRole('heading', { level: 2, name: /items? require[s]? action/ })).toBeInTheDocument()
  })

  /*
   * The bar used to sit above every step, so "4 items require action" was the first thing
   * read on the Scope step and on the Telemetry step alike, competing with the step
   * heading. Step 10 is *Work the Alert at the top*; the top is there.
   */
  it('stays off the steps that are not about Alerts', () => {
    search.current = new URLSearchParams('step=7')
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ScenarioPanel />
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    fireEvent.click(screen.getAllByRole('button', { name: /^Fault$/ })[5]!)
    settle()

    expect(screen.queryByText(/items? require[s]? action/i)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Watch the airspace' })).toBeInTheDocument()
  })

  /*
   * The rail was the only way between Control steps, and it minimises and slides away on a
   * narrow board. Both ends stay on Control: step 6 does not walk back into set-up.
   */
  it('carries Back and Next between the Control steps', () => {
    search.current = new URLSearchParams('step=7')
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/control?step=6')
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute('href', '/control?step=8')
  })

  it('has no Back on the first Control step and no Next on the last', () => {
    search.current = new URLSearchParams('step=6')
    const { unmount } = render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()
    expect(screen.queryByRole('link', { name: 'Back' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute('href', '/control?step=7')
    unmount()

    search.current = new URLSearchParams('step=11')
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/control?step=10')
    expect(screen.queryByRole('link', { name: 'Next' })).not.toBeInTheDocument()
  })
})
