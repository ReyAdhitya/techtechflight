import {
  aDroneState,
  aFleetState,
  aTelemetry,
  aNeverHeardFromDrone,
} from '@techtechflight/contract/fixtures'
import type { FleetSnapshot } from '@/lib/fleet-connection'

/**
 * The unglamorous states, on demand.
 *
 * A showcase that could only be looked at with a ground station running would be judged
 * entirely on its happy path, which is the one place a maximalist board always wins.
 * These are built from the contract's own fixtures — the same builders the ground
 * station's tests and the restrained board's tests use — so the Drones on screen are
 * shaped exactly like real ones rather than like something invented for a screenshot.
 */

export type ScenarioId = 'live' | 'demo' | 'stale' | 'lost' | 'empty'

export interface Scenario {
  readonly id: ScenarioId
  readonly label: string
  /** What a Teacher would actually be looking at when this happens. */
  readonly note: string
}

export const SCENARIOS: readonly Scenario[] = [
  { id: 'live', label: 'Live', note: 'Fleet State from the ground station on this machine.' },
  { id: 'demo', label: 'Demonstration Fleet', note: 'Contract fixtures. Not a real Fleet.' },
  {
    id: 'stale',
    label: 'Stale Telemetry',
    note: 'Every Drone still in contact, but nothing heard recently enough to trust.',
  },
  {
    id: 'lost',
    label: 'Ground station lost',
    note: 'The last Fleet State, held and ageing, while the board tries to reconnect.',
  },
  { id: 'empty', label: 'Fleet with no Drones', note: 'A School that has not registered any yet.' },
]

const SECOND = 1_000
const MINUTE = 60 * SECOND

/**
 * The same six Drones the simulated Telemetry Source registers, so the showcase and the
 * restrained board are looking at the same classroom set rather than at two different
 * inventions.
 */
function classroomFleet(at: number) {
  return [
    aDroneState({
      id: 'ttf-0001',
      name: 'Drone 1',
      status: 'Ready',
      lastContact: at - 2 * SECOND,
      telemetry: aTelemetry({ batteryFraction: 0.86 }),
    }),
    aDroneState({
      id: 'ttf-0002',
      name: 'Drone 2',
      status: 'Not Ready',
      lastContact: at - 3 * SECOND,
      telemetry: aTelemetry({ batteryFraction: 0.14 }),
      // Only ever set when the ground station has watched the charge go in (ADR-0007).
      timeToReadyMs: 12 * MINUTE,
    }),
    aDroneState({
      id: 'ttf-0003',
      name: 'Drone 3',
      status: 'Flying',
      lastContact: at - 1 * SECOND,
      telemetry: aTelemetry({
        batteryFraction: 0.63,
        airborne: true,
        extra: { altitudeM: 2.4, motorTemperatureC: 41 },
      }),
    }),
    aDroneState({
      id: 'ttf-0004',
      name: 'Drone 4',
      status: 'Fault',
      lastContact: at - 4 * SECOND,
      telemetry: aTelemetry({
        batteryFraction: 0.71,
        fault: { code: 'IMU_CALIBRATION', description: 'Motion sensor needs recalibrating' },
      }),
    }),
    aDroneState({
      id: 'ttf-0005',
      name: 'Drone 5',
      status: 'Ready',
      lastContact: at - 2 * SECOND,
      telemetry: aTelemetry({
        batteryFraction: 0.94,
        // The hardware cannot measure this one precisely, and the board says so.
        batteryIsEstimate: true,
        extra: { motorTemperatureC: 29 },
      }),
    }),
    aDroneState({
      id: 'ttf-0006',
      name: 'Drone 6',
      status: 'Offline',
      lastContact: at - 4 * MINUTE,
      stale: true,
      telemetry: aTelemetry({ batteryFraction: 0.55 }),
    }),
  ]
}

/** Everything in contact, nothing heard recently enough for the reading to be trusted. */
function staleFleet(at: number) {
  return classroomFleet(at).map((drone) =>
    drone.lastContact === null
      ? drone
      : aDroneState({ ...drone, stale: true, lastContact: at - 26 * SECOND }),
  )
}

/**
 * A Fleet State fabricated at `at`, presented exactly the way a real one is: with a
 * `receivedAt` anchor, so every age on screen is computed by the board's own arithmetic
 * rather than pre-baked into the fixture.
 */
export function buildScenario(id: ScenarioId, at: number): FleetSnapshot | null {
  switch (id) {
    case 'live':
      return null
    case 'demo':
      return { connection: 'live', state: aFleetState(classroomFleet(at), at), receivedAt: at }
    case 'stale':
      return { connection: 'live', state: aFleetState(staleFleet(at), at), receivedAt: at }
    case 'lost':
      /*
       * The last thing the ground station said, 38 seconds ago and ageing. `receivedAt`
       * sits in the past so the ages a Teacher reads keep climbing while the board
       * retries — the whole point of retaining the state rather than blanking.
       */
      return {
        connection: 'unreachable',
        state: aFleetState(classroomFleet(at - 38 * SECOND), at - 38 * SECOND),
        receivedAt: at - 38 * SECOND,
      }
    case 'empty':
      return { connection: 'live', state: aFleetState([], at), receivedAt: at }
  }
}

/** A School that owns a Drone it has never heard from. Used by the empty-Fleet copy. */
export function neverHeardFrom(name: string) {
  return aNeverHeardFromDrone({ id: `ttf-${name}`, name })
}
