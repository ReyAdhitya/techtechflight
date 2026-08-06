import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { CameraState } from '@techtechflight/contract'
import type { ScenarioControls } from '@/lib/fleet-link'
import { clearStoredCameraStreamMap, writeCameraStreamMap } from '@/lib/camera-stream-map'
import type { ObjectDetector } from '@/lib/object-detection'
import type { LandingTarget } from '@/lib/qr/landing-target'
import type { LandingTargetScanner } from '@/lib/qr/scan-landing-target'
import { CameraPane } from './CameraPane'

/**
 * The camera surface on Drone detail — Phase 2 local integration:
 * stream map, demo detector, QR landing targets.
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

const mockDetector = (overrides?: Partial<ObjectDetector>): ObjectDetector => ({
  displayName: 'Test detector',
  demo: true,
  detect: vi.fn(async () => [
    {
      id: 'box-1',
      label: 'person',
      confidence: 0.9,
      box: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
    },
  ]),
  ...overrides,
})

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

beforeEach(() => {
  clearStoredCameraStreamMap()
  vi.unstubAllEnvs()
})

afterEach(() => {
  clearStoredCameraStreamMap()
  vi.unstubAllEnvs()
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
    expect(screen.queryByRole('list', { name: /detections/i })).not.toBeInTheDocument()
  })

  it('offers Start camera on a simulated Fleet when fitted but idle', () => {
    const controls = scenarios()
    render(
      <CameraPane
        droneId="ttf-0001"
        droneName="Drone 1"
        camera={{ streaming: false }}
        scenarios={controls}
        detector={mockDetector()}
        landingScanner={null}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }))
    expect(controls.startCamera).toHaveBeenCalledWith('ttf-0001')
    expect(screen.queryByRole('list', { name: /detections/i })).not.toBeInTheDocument()
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
    expect(screen.getByText(/Simulated feed\. Not a live aircraft camera/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Stop camera' }))
    expect(controls.stopCamera).toHaveBeenCalledWith('ttf-0001')
  })

  it('ignores the school stream map on a simulated Fleet', () => {
    writeCameraStreamMap({ 'ttf-0001': 'https://cam.school.example/1' })
    render(
      <CameraPane
        droneId="ttf-0001"
        droneName="Drone 1"
        camera={{ streaming: true }}
        scenarios={scenarios()}
        landingScanner={null}
      />,
    )

    expect(
      screen.getByRole('img', { name: 'Simulated camera feed for Drone 1' }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText(/Live camera stream/)).not.toBeInTheDocument()
  })

  it('draws detections on the simulated feed while streaming', async () => {
    const detector = mockDetector()
    render(
      <CameraPane
        droneId="ttf-0001"
        droneName="Drone 1"
        camera={{ streaming: true }}
        scenarios={scenarios()}
        detector={detector}
        landingScanner={null}
      />,
    )

    const overlay = await screen.findByRole('list', {
      name: /Demo detections from Test detector/,
    })
    expect(overlay.querySelector('[data-detection-label="person"]')).not.toBeNull()
    expect(screen.getByText(/Test detector \(not a loaded model\)/)).toBeInTheDocument()
    expect(detector.detect).toHaveBeenCalled()
  })

  it('stays quiet when the detector fails, without crashing the pane', async () => {
    const detector = mockDetector({
      detect: vi.fn(async () => {
        throw new Error('weights missing')
      }),
    })
    render(
      <CameraPane
        droneId="ttf-0001"
        droneName="Drone 1"
        camera={{ streaming: true }}
        scenarios={scenarios()}
        detector={detector}
        landingScanner={null}
      />,
    )

    expect(
      screen.getByRole('img', { name: 'Simulated camera feed for Drone 1' }),
    ).toBeInTheDocument()
    await waitFor(() => expect(detector.detect).toHaveBeenCalled())
    expect(screen.queryByRole('list', { name: /detections/i })).not.toBeInTheDocument()
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

  it('names streaming on hardware without pretending there is a picture when unmapped', () => {
    render(
      <CameraPane
        droneId="ttf-0001"
        droneName="Drone 1"
        camera={{ streaming: true }}
        scenarios={null}
        detector={mockDetector()}
        landingScanner={null}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent(/Camera is streaming/)
    expect(screen.getByRole('status')).toHaveTextContent(/does not carry a URL/)
    expect(screen.queryByRole('button', { name: /camera/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: /detections/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Live camera stream/)).not.toBeInTheDocument()
  })

  it('plays a mapped school stream on hardware when Telemetry says streaming', () => {
    writeCameraStreamMap({ 'ttf-0001': 'https://cam.school.example/drone1' })
    render(
      <CameraPane
        droneId="ttf-0001"
        droneName="Drone 1"
        camera={{ streaming: true }}
        scenarios={null}
        landingScanner={null}
      />,
    )

    const video = screen.getByLabelText('Live camera stream for Drone 1')
    expect(video.tagName).toBe('VIDEO')
    expect(video).toHaveAttribute('src', 'https://cam.school.example/drone1')
    expect(screen.getByText(/School stream · from the stream map/)).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
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
    expect(screen.getByText(/Where to land · east 2 m · north 1 m/)).toBeInTheDocument()
    expect(screen.getByText(/Not written into Telemetry/)).toBeInTheDocument()
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
