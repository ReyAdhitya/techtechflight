import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { FleetProvider } from '@/components/FleetProvider'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { ControlScreen } from './ControlScreen'

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(3_000)
  })

beforeEach(() => {
  pathname.current = '/demo'
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Scope camera filmstrip on Control', () => {
  it('renders one thumb per Drone in board order under the scope', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    const filmstrip = screen.getByRole('list', { name: 'Camera filmstrip' })
    const thumbs = within(filmstrip).getAllByRole('button', { name: / camera$/i })
    expect(thumbs).toHaveLength(6)
    expect(thumbs.map((thumb) => thumb.getAttribute('aria-label'))).toEqual([
      'Drone 1 camera',
      'Drone 2 camera',
      'Drone 3 camera',
      'Drone 4 camera',
      'Drone 5 camera',
      'Drone 6 camera',
    ])
  })

  it('opens CameraSlide when a thumb is clicked', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    const filmstrip = screen.getByRole('list', { name: 'Camera filmstrip' })
    fireEvent.click(within(filmstrip).getByRole('button', { name: 'Drone 2 camera' }))

    const popup = screen.getByRole('dialog', { name: 'Drone 2 camera' })
    expect(within(popup).getByRole('button', { name: 'Start camera' })).toBeInTheDocument()
  })

  it('lights the thumb for the scope-selected Drone', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    const figure = screen.getByRole('img', { name: /looking down/ }).closest('figure')!
    fireEvent.click(within(figure).getByRole('button', { name: /Drone 3/ }))

    const filmstrip = screen.getByRole('list', { name: 'Camera filmstrip' })
    expect(within(filmstrip).getByRole('button', { name: 'Drone 3 camera' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
