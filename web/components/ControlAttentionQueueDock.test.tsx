import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { ControlScreen } from './ControlScreen'
import { FleetProvider } from './FleetProvider'
import { ScenarioPanel } from './ScenarioPanel'

/**
 * Attention queue dock on Control — sorted needs-you list that jumps to the matching strip.
 */

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

beforeEach(() => {
  pathname.current = '/demo'
  vi.useFakeTimers()
  Element.prototype.scrollIntoView = vi.fn()
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0)
    return 0
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Attention queue dock on Control', () => {
  it('stays hidden when nothing needs you', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    expect(screen.queryByRole('navigation', { name: 'Attention queue' })).not.toBeInTheDocument()
  })

  it('lists alerts worst first and selects the matching strip on click', () => {
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

    const dock = screen.getByRole('navigation', { name: 'Attention queue' })
    const queueButtons = within(dock).getAllByRole('button')
    expect(queueButtons.length).toBeGreaterThanOrEqual(1)
    expect(queueButtons[0]).toHaveTextContent('Drone 6')

    fireEvent.click(queueButtons[0]!)

    const strip = screen.getByRole('link', { name: 'Drone 6' }).closest('li')
    expect(strip).not.toBeNull()
    expect(strip).toHaveClass('outline-2')
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
  })
})
