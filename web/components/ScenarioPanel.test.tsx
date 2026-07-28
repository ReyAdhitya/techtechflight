import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { ControlScreen } from './ControlScreen'
import { FleetProvider } from './FleetProvider'
import { ScenarioPanel } from './ScenarioPanel'

/**
 * Requirement C9, guarded rather than agreed.
 *
 * Asking a Drone to land is a request to an aircraft and can one day be a real one.
 * Inventing a fault is the world pretending, and never can be. They must not share a
 * surface, and a rule about restraint is exactly the kind that erodes quietly — so it
 * gets a test rather than a comment.
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
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the demonstration panel', () => {
  it('offers the world misbehaving, on a simulated Fleet', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ScenarioPanel />
      </FleetProvider>,
    )
    settle()

    expect(screen.getAllByRole('button', { name: /^Fault$/ })).toHaveLength(6)
    expect(screen.getAllByRole('button', { name: /Drop the link/ })).toHaveLength(6)
  })

  it('says plainly that none of it is a Command', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ScenarioPanel />
      </FleetProvider>,
    )
    settle()

    expect(screen.getByText(/They are not Commands/i)).toBeInTheDocument()
  })
})

describe('the Flight Control Center', () => {
  it('offers Commands', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    expect(screen.getAllByRole('button', { name: /^Land$/ }).length).toBeGreaterThan(0)
  })

  it('offers no way to pretend something broke', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    // The guard. Nothing that makes the world misbehave may appear beside a request to
    // an aircraft, however convenient it would be during a demonstration.
    for (const forbidden of [/^Fault$/, /Drop the link/, /Flatten the battery/, /Take off/]) {
      expect(screen.queryByRole('button', { name: forbidden })).not.toBeInTheDocument()
    }
  })
})
