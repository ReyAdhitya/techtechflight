import type { DroneState, FleetState, Status, Telemetry } from './index.ts'

/**
 * Fleet State builders shared by both seams.
 *
 * The ground station's tests assert on values shaped like these; the dashboard's tests
 * are driven by them. That shared shape is what stops the two halves drifting — a
 * change to Fleet State that breaks one seam has to break the other.
 */

export function aTelemetry(overrides: Partial<Telemetry> = {}): Telemetry {
  return {
    batteryFraction: 0.9,
    batteryIsEstimate: false,
    airborne: false,
    fault: null,
    ...overrides,
  }
}

export function aDroneState(overrides: Partial<DroneState> = {}): DroneState {
  return {
    id: 'drone-1',
    name: 'Drone 1',
    status: 'Ready',
    telemetry: aTelemetry(),
    lastContact: 0,
    stale: false,
    // Null is the resting value. Most Drones are not charging, and the ground station
    // says nothing rather than guessing.
    timeToReadyMs: null,
    ...overrides,
  }
}

/** A Drone the School owns but has never responded — not a failed one. */
export function aNoResponseDrone(overrides: Partial<DroneState> = {}): DroneState {
  return aDroneState({
    status: 'Offline',
    telemetry: null,
    lastContact: null,
    stale: false,
    ...overrides,
  })
}

export function aFleetState(
  drones: readonly DroneState[],
  generatedAt = 0,
): FleetState {
  return { drones, generatedAt }
}

/**
 * One Drone in each Status, in board order. The canonical input for dashboard tests
 * that need the whole vocabulary on screen at once.
 */
export function aFleetInEveryStatus(generatedAt = 100_000): FleetState {
  const statuses: readonly Status[] = ['Ready', 'Not Ready', 'Fault', 'Flying', 'Offline']
  const drones = statuses.map((status, index) =>
    aDroneState({
      id: `ttf-000${index + 1}`,
      name: `Drone ${index + 1}`,
      status,
      lastContact: status === 'Offline' ? generatedAt - 120_000 : generatedAt - 1_000,
      stale: status === 'Offline',
      telemetry: aTelemetry({
        batteryFraction: status === 'Not Ready' ? 0.12 : 0.82,
        airborne: status === 'Flying',
        fault:
          status === 'Fault'
            ? { code: 'IMU_CALIBRATION', description: 'Motion sensor needs recalibrating' }
            : null,
      }),
    }),
  )
  return aFleetState(drones, generatedAt)
}
