import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { clearLogbook } from '@/lib/logbook'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { ControlScreen } from './ControlScreen'
import { FleetProvider } from './FleetProvider'
import { HistorySections } from './HistoryScreen'

/**
 * The two screens that put a `Scope` on the board.
 *
 * `Scope` has been rewritten three times in one run — a fixed window, then a Fleet-centred
 * one, then renamed types — and nothing rendered either of its consumers with a Fleet that
 * had positions in it. `screen-states.test.tsx` renders the Flight Control Center, but only
 * before Telemetry arrives and only with nothing of the Teacher's own, so the filled case
 * where marks are actually drawn was never reached from a screen.
 *
 * These are smoke tests and are meant to stay that way: enough that a change to `Scope`'s
 * props cannot break a consumer silently, not a second suite for either screen.
 *
 * The two consumers differ in one way that matters, and it is why both are here rather than
 * one: the Flight Control Center passes `vitals` and Reports does not. Everything a mark is
 * labelled with comes off `DroneState` for exactly that reason, and a change that quietly
 * started sourcing a label from `vitals` would leave Reports a field of anonymous dots with
 * nothing to catch it.
 */

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

/** Long enough for the simulated Fleet to have reported at least one position. */
const SETTLE_MS = 3_000

const show = (node: React.ReactNode) => {
  const rendered = render(
    <FleetProvider demonstration={PINNED_DEMONSTRATION}>{node}</FleetProvider>,
  )
  act(() => {
    vi.advanceTimersByTime(SETTLE_MS)
  })
  return rendered
}

beforeEach(() => {
  clearLogbook()
  pathname.current = '/demo'
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the Flight Control Center, with a Fleet that is reporting where it is', () => {
  it('draws a mark for every Drone, each one selectable', () => {
    show(<ControlScreen />)

    const marks = screen.getAllByRole('button', { name: /Drone \d/ })
    expect(marks.length).toBeGreaterThan(0)
  })

  it('offers Land Hold Stop in full screen when a mark is selected', () => {
    show(<ControlScreen />)

    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }))
    const dialog = screen.getByRole('dialog', { name: 'Scope full screen' })
    const mark = within(dialog).getAllByRole('button', { name: /Drone \d/ })[0]!
    fireEvent.click(mark)

    const dock = within(dialog).getByRole('region', { name: /Controls for Drone/ })
    expect(within(dock).getByRole('button', { name: 'Land' })).toBeInTheDocument()
    expect(within(dock).getByRole('button', { name: 'Hold' })).toBeInTheDocument()
    expect(within(dock).getByRole('button', { name: /^Stop$/ })).toBeInTheDocument()
  })

  it('gives the scope a name that does not call it a room', () => {
    show(<ControlScreen />)

    const scope = screen.getByRole('img', { name: /Drones are, looking down/ })
    expect(scope).toBeInTheDocument()
    expect(scope.getAttribute('aria-label')).not.toMatch(/room/i)
  })
})

describe('Reports, which renders the scope without vitals', () => {
  /*
   * The acceptance item from #9 — *"HistoryScreen still renders, it passes no vitals"* —
   * which until now was checked by reading the code rather than by running it.
   */
  it('renders the scope at all, with no vitals to give it', () => {
    show(<HistorySections />)

    expect(screen.getByRole('img', { name: /Drones are, looking down/ })).toBeInTheDocument()
  })

  /*
   * The Drone Name and the height come off `DroneState`, not off Vitals, so a screen with no
   * Vitals to give still gets a labelled picture. Sourcing either from `vitals` would leave
   * this screen a field of anonymous dots and nothing would have caught it.
   */
  it('labels its marks even though it has no vitals to give', () => {
    show(<HistorySections />)

    expect(screen.getAllByText(/^Drone \d$/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/^-?\d+\.\d m$/).length).toBeGreaterThan(0)
  })
})
