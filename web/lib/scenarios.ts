import {
  aDroneState,
  aFleetState,
  aTelemetry,
  aNeverHeardFromDrone,
} from '@techtechflight/contract/fixtures'
import type {
  BatterySample,
  DroneBatteryHistory,
  DroneState,
  FleetEvent,
  FleetEventKind,
  FleetHistory,
  Status,
} from '@techtechflight/contract'
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
 *
 * Between them they cover every case the display has to get right: a linked pair in the
 * air, a Drone too close to something, a latched emergency stop, an airframe with no
 * rangefinder at all (which must not look like one that sees nothing), an estimated
 * battery, and a Drone nobody has heard from in minutes.
 */
function classroomFleet(at: number) {
  return [
    aDroneState({
      id: 'ttf-0001',
      name: 'Drone 1',
      status: 'Flying',
      lastContact: at - 2 * SECOND,
      telemetry: aTelemetry({
        batteryFraction: 0.71,
        airborne: true,
        altitudeM: 2.1,
        orientation: { pitchDegrees: 4.2, rollDegrees: -2.8, yawDegrees: 118 },
        motors: motorsAt(0.48, 4.2, -2.8),
        autoLanding: 'ready',
        camera: { streaming: true },
        proximity: { metres: 2.4, bearingDegrees: 95 },
        position: { eastM: 0.6, northM: 1.2 },
        linkGroupId: 'group-a',
        extra: { satellitesVisible: 11, firmware: '1.4.2' },
      }),
    }),
    aDroneState({
      id: 'ttf-0002',
      name: 'Drone 2',
      status: 'Not Ready',
      lastContact: at - 3 * SECOND,
      telemetry: aTelemetry({
        batteryFraction: 0.14,
        altitudeM: 0,
        motors: motorsAt(0, 0, 0),
        autoLanding: 'unavailable',
        proximity: null,
        position: { eastM: 1, northM: 0 },
        linkGroupId: null,
        extra: { satellitesVisible: 9, firmware: '1.4.2' },
      }),
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
        altitudeM: 1.7,
        orientation: { pitchDegrees: -6.1, rollDegrees: 9.4, yawDegrees: 271 },
        motors: motorsAt(0.51, -6.1, 9.4),
        autoLanding: 'ready',
        camera: { streaming: false },
        // Close enough that the board has to say so. This is the obstacle case.
        proximity: { metres: 0.6, bearingDegrees: 18 },
        position: { eastM: 2.2, northM: 1.6 },
        linkGroupId: 'group-a',
        extra: { satellitesVisible: 10, firmware: '1.4.2' },
      }),
    }),
    aDroneState({
      id: 'ttf-0004',
      name: 'Drone 4',
      status: 'Fault',
      lastContact: at - 4 * SECOND,
      telemetry: aTelemetry({
        batteryFraction: 0.71,
        // Latched. This is the safety case, and it outranks everything else on the tile.
        emergencyStopTriggered: true,
        altitudeM: 0,
        motors: motorsAt(0, 0, 0),
        autoLanding: 'unavailable',
        proximity: null,
        position: { eastM: 3, northM: 0 },
        linkGroupId: null,
        fault: { code: 'ESTOP_LATCHED', description: 'Emergency stop was pressed' },
        extra: { satellitesVisible: 8, firmware: '1.4.2' },
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
        altitudeM: 0,
        motors: motorsAt(0, 0, 0),
        autoLanding: 'unsupported',
        // No `proximity` key at all: this airframe has no rangefinder. Absent is not the
        // same as null, and the board must not draw them the same way.
        position: { eastM: 4, northM: 0 },
        linkGroupId: null,
        extra: { motorTemperatureC: 29, satellitesVisible: 7, firmware: '1.3.9' },
      }),
    }),
    aDroneState({
      id: 'ttf-0006',
      name: 'Drone 6',
      status: 'Offline',
      lastContact: at - 4 * MINUTE,
      stale: true,
      telemetry: aTelemetry({
        batteryFraction: 0.55,
        altitudeM: 0,
        motors: motorsAt(0, 0, 0),
        autoLanding: 'unavailable',
        position: { eastM: 5, northM: 0 },
        linkGroupId: null,
        extra: { satellitesVisible: 4, firmware: '1.4.2' },
      }),
    }),
  ]
}

/** Four motors, leaning the way the airframe is leaning. Same rule the simulator uses. */
function motorsAt(base: number, pitchDegrees: number, rollDegrees: number) {
  const pitch = base === 0 ? 0 : pitchDegrees / 90
  const roll = base === 0 ? 0 : rollDegrees / 90
  return [
    { id: 'front-left', thrustFraction: clamp(base - pitch + roll), temperatureC: 41 },
    { id: 'front-right', thrustFraction: clamp(base - pitch - roll), temperatureC: 40 },
    { id: 'rear-left', thrustFraction: clamp(base + pitch + roll), temperatureC: 42 },
    { id: 'rear-right', thrustFraction: clamp(base + pitch - roll), temperatureC: 41 },
  ]
}

const clamp = (value: number) => Number(Math.min(1, Math.max(0, value)).toFixed(3))

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
    case 'demo': {
      const drones = classroomFleet(at)
      return {
        connection: 'live',
        state: aFleetState(drones, at),
        receivedAt: at,
        history: buildHistory(drones, at),
      }
    }
    case 'stale': {
      const drones = staleFleet(at)
      return {
        connection: 'live',
        state: aFleetState(drones, at),
        receivedAt: at,
        history: buildHistory(drones, at),
      }
    }
    case 'lost': {
      /*
       * The last thing the ground station said, 38 seconds ago and ageing. `receivedAt`
       * sits in the past so the ages a Teacher reads keep climbing while the board
       * retries — the whole point of retaining the state rather than blanking.
       */
      const heardAt = at - 38 * SECOND
      const drones = classroomFleet(heardAt)
      return {
        connection: 'unreachable',
        state: aFleetState(drones, heardAt),
        receivedAt: heardAt,
        history: buildHistory(drones, heardAt),
      }
    }
    case 'empty':
      return {
        connection: 'live',
        state: aFleetState([], at),
        receivedAt: at,
        history: { events: [], batteries: [], since: at - LESSON_WINDOW_MS },
      }
  }
}

/** A School that owns a Drone it has never heard from. Used by the empty-Fleet copy. */
export function neverHeardFrom(name: string) {
  return aNeverHeardFromDrone({ id: `ttf-${name}`, name })
}

/* --- A morning that already happened ------------------------------------- */

/** How far back a demonstration history reaches. About one lesson plus setting up. */
const LESSON_WINDOW_MS = 55 * MINUTE

/**
 * A plausible morning, so every screen that reads history has something real to draw.
 *
 * Deliberately hand-written rather than randomised: a demonstration that produced a
 * different Fleet on every reload could not be talked through, and a battery curve that
 * wandered would make the chart look like noise instead of like a lesson. Every event
 * here is one the ground station's own `deriveEvents` would have produced from the same
 * pair of Fleet States.
 */
function buildHistory(drones: readonly DroneState[], at: number): FleetHistory {
  const nameOf = (id: string) => drones.find((drone) => drone.id === id)?.name ?? id

  const script: readonly (readonly [number, string, FleetEventKind, Status, string | null])[] = [
    [52, 'ttf-0001', 'first-contact', 'Ready', null],
    [52, 'ttf-0003', 'first-contact', 'Ready', null],
    [51, 'ttf-0005', 'first-contact', 'Ready', null],
    [50, 'ttf-0002', 'first-contact', 'Ready', null],
    [49, 'ttf-0004', 'first-contact', 'Ready', null],
    [44, 'ttf-0006', 'first-contact', 'Ready', null],
    [38, 'ttf-0001', 'took-off', 'Flying', null],
    [37, 'ttf-0003', 'took-off', 'Flying', null],
    [31, 'ttf-0003', 'landed', 'Ready', 'Now Ready'],
    [30, 'ttf-0001', 'landed', 'Ready', 'Now Ready'],
    [26, 'ttf-0002', 'charge-low', 'Not Ready', null],
    [22, 'ttf-0004', 'took-off', 'Flying', null],
    [19, 'ttf-0004', 'fault-raised', 'Fault', 'Motion sensor needs recalibrating'],
    [17, 'ttf-0004', 'fault-cleared', 'Ready', 'Now Ready'],
    [12, 'ttf-0006', 'contact-lost', 'Offline', null],
    [9, 'ttf-0001', 'took-off', 'Flying', null],
    [8, 'ttf-0003', 'took-off', 'Flying', null],
    [4, 'ttf-0004', 'fault-raised', 'Fault', 'Emergency stop was pressed'],
  ]

  const events: FleetEvent[] = script.map(([minutesAgo, droneId, kind, to, detail]) => {
    const when = at - minutesAgo * MINUTE
    return {
      id: `${droneId}@${when}#${kind}`,
      at: when,
      droneId,
      droneName: nameOf(droneId),
      kind,
      from: null,
      to,
      detail,
      severity:
        kind === 'fault-raised' ? 'fault' : kind === 'charge-low' ? 'attention' : 'routine',
    }
  })

  return {
    events,
    batteries: drones.map((drone) => batteryHistory(drone, at)),
    since: at - LESSON_WINDOW_MS,
  }
}

/**
 * A battery curve for one Drone, ending exactly where its current reading is.
 *
 * Shaped from what the Drone is doing rather than from noise: a charging Drone climbs,
 * a flying one falls away steeply, a Drone on the bench barely moves. Ending on the live
 * value matters — a chart whose last point disagreed with the number beside it would
 * undermine both.
 */
function batteryHistory(drone: DroneState, at: number): DroneBatteryHistory {
  const now = drone.telemetry?.batteryFraction ?? 0
  const charging = drone.timeToReadyMs !== null
  const flying = drone.status === 'Flying'

  const points = 28
  const stepMs = LESSON_WINDOW_MS / points
  // How far back the charge was, relative to now. Charging means it started lower.
  const travel = charging ? -0.16 : flying ? 0.19 : 0.04

  const samples: BatterySample[] = []
  for (let index = 0; index <= points; index += 1) {
    const fromEnd = points - index
    const progress = fromEnd / points
    // Slightly eased rather than linear, so a curve reads as a discharge and not a ruler.
    const value = now + travel * progress * (0.7 + 0.3 * progress)
    samples.push({
      at: at - fromEnd * stepMs,
      fraction: Number(Math.min(1, Math.max(0, value)).toFixed(3)),
    })
  }

  /*
   * A Drone nobody has heard from stops having a curve at the point it fell silent. A
   * line that carried on to the present would be the board inventing readings, which is
   * the one thing it exists not to do.
   */
  const lastHeard = drone.lastContact
  return {
    droneId: drone.id,
    samples: lastHeard === null ? [] : samples.filter((sample) => sample.at <= lastHeard),
  }
}
