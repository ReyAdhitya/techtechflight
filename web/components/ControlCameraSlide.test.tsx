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

describe('opening a camera slide from Control', () => {
  it('opens CameraPane for that Drone and closes on Close', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    const strip = screen.getByRole('link', { name: 'Drone 1' }).closest('li')
    expect(strip).not.toBeNull()
    fireEvent.click(within(strip as HTMLElement).getByRole('button', { name: 'Camera' }))

    const slide = screen.getByRole('dialog', { name: 'Drone 1 camera' })
    expect(within(slide).getByRole('button', { name: 'Start camera' })).toBeInTheDocument()

    fireEvent.click(within(slide).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog', { name: 'Drone 1 camera' })).not.toBeInTheDocument()
  })

  it('dismisses the slide on Escape', async () => {
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
    expect(within(strip).getByRole('button', { name: 'Land' })).toBeInTheDocument()
    expect(within(strip).getByRole('button', { name: 'Hover' })).toBeInTheDocument()
    expect(within(strip).getByRole('button', { name: /^Stop$/ })).toBeInTheDocument()
    expect(within(strip).getByRole('button', { name: 'Camera' })).toBeInTheDocument()
  })

  it('leaves the Settings stream map in place', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <SettingsScreen />
      </FleetProvider>,
    )
    settle()

    expect(screen.getByText('School camera streams')).toBeInTheDocument()
    expect(screen.getByText(/NEXT_PUBLIC_CAMERA_STREAM_MAP/)).toBeInTheDocument()
  })

  it('never puts a stream URL on the Telemetry camera shape', () => {
    const camera: CameraState = { streaming: true }
    expect(Object.keys(camera)).toEqual(['streaming'])
    expect('url' in camera).toBe(false)
  })
})
