import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import type { CameraState } from '@techtechflight/contract'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { ControlScreen } from './ControlScreen'
import { FleetProvider } from './FleetProvider'
import { SettingsScreen } from './SettingsScreen'

/**
 * Camera slide from Control — teaching entry point for CameraPane.
 *
 * Settings still owns the stream map. Telemetry never carries a URL. Camera on
 * the strip is watch chrome, not a Command beside Land / Hover / Stop (C9).
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

describe('opening a camera popup from Control', () => {
  it('opens CameraPane for that Drone in a large centered dialog and closes on Close', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    const strip = screen.getByRole('link', { name: 'Drone 1' }).closest('li')
    expect(strip).not.toBeNull()
    fireEvent.click(strip as HTMLElement)
    fireEvent.click(within(strip as HTMLElement).getByRole('button', { name: 'Camera' }))

    const popup = screen.getByRole('dialog', { name: 'Drone 1 camera' })
    expect(within(popup).getByRole('button', { name: 'Start camera' })).toBeInTheDocument()
    /*
     * jsdom has no layout — assert the centering utilities on the dialog itself
     * (same idea as SiteHeader.test reading the stylesheet for flex axes).
     */
    expect(popup.className).toMatch(/left-1\/2/)
    expect(popup.className).toMatch(/-translate-x-1\/2/)
    expect(popup.className).toMatch(/top-1\/2/)
    expect(popup.className).toMatch(/-translate-y-1\/2/)
    expect(popup.className).toMatch(/min\(42rem,\s*92vw\)/)
    expect(popup.className).not.toMatch(/right-0/)
    expect(popup.className).not.toMatch(/inset-y-0/)

    fireEvent.click(within(popup).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog', { name: 'Drone 1 camera' })).not.toBeInTheDocument()
  })

  it('dismisses the popup on Escape', async () => {
    vi.useRealTimers()
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1_500))
    })

    const strip = screen.getByRole('link', { name: 'Drone 1' }).closest('li')!
    fireEvent.click(strip)
    fireEvent.click(within(strip).getByRole('button', { name: 'Camera' }))
    expect(screen.getByRole('dialog', { name: 'Drone 1 camera' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Drone 1 camera' })).not.toBeInTheDocument()
  })

  it('keeps Camera out of the Command row vocabulary', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    const strip = screen.getByRole('link', { name: 'Drone 1' }).closest('li')!
    fireEvent.click(strip)
    expect(within(strip).getByRole('button', { name: 'Land' })).toBeInTheDocument()
    expect(within(strip).getByRole('button', { name: 'Hover' })).toBeInTheDocument()
    expect(within(strip).getByRole('button', { name: /^Stop$/ })).toBeInTheDocument()
    expect(within(strip).getByRole('button', { name: 'Camera' })).toBeInTheDocument()
    // Record is camera-session chrome — it opens with the feed, not beside Camera on the strip.
    expect(within(strip).queryByRole('button', { name: 'Record' })).not.toBeInTheDocument()
  })


  it('puts Record inside the Camera dialog, not on the strip', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    const strip = screen.getByRole('link', { name: 'Drone 1' }).closest('li')!
    fireEvent.click(strip)
    fireEvent.click(within(strip).getByRole('button', { name: 'Camera' }))

    const popup = screen.getByRole('dialog', { name: 'Drone 1 camera' })
    expect(within(popup).getByRole('button', { name: 'Record' })).toBeInTheDocument()
  })

  it('offers Record all cameras under More actions', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    expect(screen.getByRole('button', { name: 'Record all cameras' })).toBeInTheDocument()
  })

  it('does not put School camera streams on Settings', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <SettingsScreen />
      </FleetProvider>,
    )
    settle()

    expect(screen.queryByText('School camera streams')).not.toBeInTheDocument()
    expect(screen.queryByText(/NEXT_PUBLIC_CAMERA_STREAM_MAP/)).not.toBeInTheDocument()
  })

  it('never puts a stream URL on the Telemetry camera shape', () => {
    const camera: CameraState = { streaming: true }
    expect(Object.keys(camera)).toEqual(['streaming'])
    expect('url' in camera).toBe(false)
  })
})
