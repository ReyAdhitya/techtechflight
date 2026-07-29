import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { CameraState } from '@techtechflight/contract'
import type { ScenarioControls } from '@/lib/fleet-link'
import { CameraPane } from './CameraPane'

/**
 * The camera surface on Drone detail.
 *
 * Telemetry may only carry `{ streaming: boolean }`. Start / Stop are scenario
 * controls on a simulated Fleet — never Commands, never a URL on the wire.
 */

const scenarios = (): ScenarioControls =>
  ({
    injectFault: vi.fn(),
    clearFault: vi.fn(),
    loseLink: vi.fn(),
    restoreLink: vi.fn(),
    takeOff: vi.fn(),
    setBattery: vi.fn(),
    plugIn: vi.fn(),
    placeNear: vi.fn(),
    setPosition: vi.fn(),
    setAltitude: vi.fn(),
    triggerEmergencyStop: vi.fn(),
    resetEmergencyStop: vi.fn(),
    startCamera: vi.fn(),
    stopCamera: vi.fn(),
    link: vi.fn(),
    unlink: vi.fn(),
    resetClassroom: vi.fn(),
  }) as ScenarioControls

describe('the camera pane on a Drone', () => {
  it('says so when no camera is fitted, and offers no Start', () => {
    render(
      <CameraPane
        droneId="ttf-0001"
        droneName="Drone 1"
        camera={undefined}
        scenarios={scenarios()}
      />,
    )

    expect(screen.getByText('No camera fitted')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start camera' })).not.toBeInTheDocument()
  })

  it('offers Start camera on a simulated Fleet when fitted but idle', () => {
    const controls = scenarios()
    render(
      <CameraPane
        droneId="ttf-0001"
        droneName="Drone 1"
        camera={{ streaming: false }}
        scenarios={controls}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }))
    expect(controls.startCamera).toHaveBeenCalledWith('ttf-0001')
  })

  it('shows a labeled simulated feed while streaming, and offers Stop', () => {
    const controls = scenarios()
    render(
      <CameraPane
        droneId="ttf-0001"
        droneName="Drone 1"
        camera={{ streaming: true }}
        scenarios={controls}
      />,
    )

    expect(
      screen.getByRole('img', { name: 'Simulated camera feed for Drone 1' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Simulated feed — not a live aircraft camera/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Stop camera' }))
    expect(controls.stopCamera).toHaveBeenCalledWith('ttf-0001')
  })

  it('does not invent Start on a hardware Fleet', () => {
    render(
      <CameraPane
        droneId="ttf-0001"
        droneName="Drone 1"
        camera={{ streaming: false }}
        scenarios={null}
      />,
    )

    expect(screen.getByText(/does not start a camera from the board/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /camera/i })).not.toBeInTheDocument()
  })

  it('names streaming on hardware without pretending there is a picture', () => {
    render(
      <CameraPane
        droneId="ttf-0001"
        droneName="Drone 1"
        camera={{ streaming: true }}
        scenarios={null}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent(/Camera is streaming/)
    expect(screen.getByRole('status')).toHaveTextContent(/does not carry a URL/)
    expect(screen.queryByRole('button', { name: /camera/i })).not.toBeInTheDocument()
  })

  it('never puts a stream URL on the Telemetry camera shape', () => {
    const camera: CameraState = { streaming: true }
    expect(Object.keys(camera)).toEqual(['streaming'])
    expect('url' in camera).toBe(false)
    expect('src' in camera).toBe(false)
    expect('href' in camera).toBe(false)
  })
})
