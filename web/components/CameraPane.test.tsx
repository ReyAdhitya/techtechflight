import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { CameraState } from '@techtechflight/contract'
import type { ScenarioControls } from '@/lib/fleet-link'
import type { LandingTarget } from '@/lib/qr/landing-target'
import type { LandingTargetScanner } from '@/lib/qr/scan-landing-target'
import { CameraPane } from './CameraPane'

/**
 * The camera surface on Drone detail.
 *
 * Telemetry may only carry `{ streaming: boolean }`. Start / Stop are scenario
 * controls on a simulated Fleet — never Commands, never a URL on the wire.
 * QR landing targets are display-only unless the Teacher presses the sim demo
 * control (#51).
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

const poseTarget = (): LandingTarget => ({
  kind: 'pose',
  id: 'pad-A',
  eastM: 2,
  northM: 1,
  raw: 'ttf-land:pad-A;east=2;north=1',
})

const scannerOf = (target: LandingTarget | null): LandingTargetScanner => ({
  scan: vi.fn(async () => target),
})

describe('the camera pane on a Drone', () => {
  it('says so when no camera is fitted, and offers no Start', () => {
    render(
      <CameraPane
        droneId="ttf-0001"
        droneName="Drone 1"
        camera={undefined}
        scenarios={scenarios()}
        landingScanner={null}
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
        landingScanner={null}
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
        landingScanner={null}
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
        landingScanner={null}
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
        landingScanner={null}
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

  it('does not scan when there is no picture', async () => {
    const scan = vi.fn(async () => poseTarget())
    render(
      <CameraPane
        droneId="ttf-0001"
        droneName="Drone 1"
        camera={{ streaming: false }}
        scenarios={scenarios()}
        landingScanner={{ scan }}
      />,
    )

    expect(scan).not.toHaveBeenCalled()
    expect(screen.queryByText(/Landing target/)).not.toBeInTheDocument()
  })

  it('shows a landing target decoded from the picture', async () => {
    render(
      <CameraPane
        droneId="ttf-0001"
        droneName="Drone 1"
        camera={{ streaming: true }}
        scenarios={scenarios()}
        landingScanner={scannerOf(poseTarget())}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('status', { name: 'Landing target: pad-A' })).toBeInTheDocument()
    })
    expect(screen.getByText(/Where to land — east 2 m · north 1 m/)).toBeInTheDocument()
    expect(screen.getByText(/not written into Telemetry/)).toBeInTheDocument()
  })

  it('stays quiet when the picture has no landing QR', async () => {
    const scan = vi.fn(async () => null)
    render(
      <CameraPane
        droneId="ttf-0001"
        droneName="Drone 1"
        camera={{ streaming: true }}
        scenarios={scenarios()}
        landingScanner={{ scan }}
      />,
    )

    await waitFor(() => {
      expect(scan).toHaveBeenCalled()
    })
    expect(screen.queryByText(/Landing target/)).not.toBeInTheDocument()
  })

  it('offers an explicit sim-only place control, and never auto-writes pose', async () => {
    const controls = scenarios()
    render(
      <CameraPane
        droneId="ttf-0001"
        droneName="Drone 1"
        camera={{ streaming: true }}
        scenarios={controls}
        landingScanner={scannerOf(poseTarget())}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Place at landing pad (demo)' })).toBeInTheDocument()
    })
    expect(controls.setPosition).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Place at landing pad (demo)' }))
    expect(controls.setPosition).toHaveBeenCalledWith('ttf-0001', 2, 1)
  })

  it('never offers place-at-pad when scenarios are absent (hardware)', async () => {
    // hasPicture is false on hardware today, so the readout stays off — and the
    // place control is further gated on `scenarios`, so a live Fleet cannot get
    // a silent Telemetry pose write from a QR (C9 / #51).
    render(
      <CameraPane
        droneId="ttf-0001"
        droneName="Drone 1"
        camera={{ streaming: true }}
        scenarios={null}
        landingScanner={scannerOf(poseTarget())}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Place at landing pad (demo)' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Landing target/)).not.toBeInTheDocument()
  })
})
