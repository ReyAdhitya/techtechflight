import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import type { CameraState, DroneState } from '@techtechflight/contract'
import { FleetProvider } from '@/components/FleetProvider'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { WallsShell } from './WallsShell'
import { CameraTile } from './CameraTile'
import { CameraWall } from './CameraWall'

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

const aDrone = (overrides: Partial<DroneState> & Pick<DroneState, 'id' | 'name'>): DroneState =>
  ({
    boardOrder: 1,
    status: 'Ready',
    stale: false,
    lastContact: 1,
    timeToReadyMs: null,
    telemetry: {
      batteryFraction: 1,
      batteryIsEstimate: false,
      airborne: false,
      fault: null,
      altitudeM: 0,
      orientation: { pitchDegrees: 0, rollDegrees: 0, yawDegrees: 0 },
      motors: { evenness: 1 },
      emergencyStopTriggered: false,
      autoLanding: 'unavailable',
      position: { eastM: 0, northM: 0 },
      linkGroupId: null,
      camera: { streaming: false },
      extra: {},
    },
    ...overrides,
  }) as DroneState

beforeEach(() => {
  pathname.current = '/demo'
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Camera wall', () => {
  it('renders one tile per Drone in board order', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <WallsShell title="Cameras">
          <CameraWall />
        </WallsShell>
      </FleetProvider>,
    )
    settle()

    expect(screen.getByRole('heading', { name: 'Cameras' })).toBeInTheDocument()
    const tiles = screen.getAllByRole('button', { name: / camera$/i })
    expect(tiles).toHaveLength(6)
    expect(tiles.map((tile) => tile.getAttribute('aria-label'))).toEqual([
      'Drone 1 camera',
      'Drone 2 camera',
      'Drone 3 camera',
      'Drone 4 camera',
      'Drone 5 camera',
      'Drone 6 camera',
    ])
  })

  it('labels fitted cameras that are not streaming on the default sim Fleet', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <CameraWall />
      </FleetProvider>,
    )
    settle()

    expect(
      screen.getAllByText(
        'Fitted, not streaming. Start the simulated feed when you want a picture.',
      ),
    ).toHaveLength(6)
  })

  it('opens CameraSlide when a tile is clicked', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <CameraWall />
      </FleetProvider>,
    )
    settle()

    fireEvent.click(screen.getByRole('button', { name: 'Drone 1 camera' }))

    const popup = screen.getByRole('dialog', { name: 'Drone 1 camera' })
    expect(within(popup).getByRole('button', { name: 'Start camera' })).toBeInTheDocument()

    fireEvent.click(within(popup).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog', { name: 'Drone 1 camera' })).not.toBeInTheDocument()
  })
})

describe('Camera tile labels', () => {
  it('says when no camera is fitted', () => {
    const telemetry = { ...aDrone({ id: 'x', name: 'x' }).telemetry! }
    delete (telemetry as { camera?: CameraState }).camera

    render(
      <CameraTile
        droneId="ttf-0002"
        droneName="Drone 2"
        drone={aDrone({ id: 'ttf-0002', name: 'Drone 2', telemetry })}
        camera={undefined}
        scenarios={null}
      />,
    )

    expect(screen.getByText('No camera fitted')).toBeInTheDocument()
  })

  it('uses board connection language when Telemetry is missing', () => {
    render(
      <CameraTile
        droneId="ttf-0001"
        droneName="Drone 1"
        drone={aDrone({ id: 'ttf-0001', name: 'Drone 1', status: 'Offline', telemetry: null })}
        camera={undefined}
        scenarios={null}
      />,
    )

    expect(screen.getByText('Offline')).toBeInTheDocument()
    expect(screen.getByText('No Telemetry yet')).toBeInTheDocument()
  })
})
