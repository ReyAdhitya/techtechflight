import type {
  DroneBatteryHistory,
  DroneId,
  DroneState,
  FleetState,
  FleetThresholds,
  LocalPosition,
  Status,
} from '@techtechflight/contract'
import { DEFAULT_PROXIMITY_WARNING_M, DEFAULT_THRESHOLDS } from '@techtechflight/contract'
import { ageMs } from './age'

/**
 * The vitals of every Drone, as a controller reads them.
 *
 * A status board answers "can I hand this out". Oversight during a lesson is a different
 * job: six aircraft are up, and the question is which one needs the Teacher next and
 * what they should do about it. That means altitude with a direction attached, charge
 * with a time attached, and distance between aircraft — none of which any single
 * Telemetry reading contains.
 *
 * Everything derived lives here and nowhere else. Two screens computing "is this one in
 * trouble" separately is how they end up disagreeing in front of a class.
 *
 * The absent-versus-null rule from the Telemetry contract carries all the way through:
 * a value this airframe cannot produce is null, never a zero that reads as a measurement.
 */

export type FlightPhase =
  | 'no-contact'
  | 'on-ground'
  | 'flying'
  | 'climbing'
  | 'level'
  | 'descending'
  | 'auto-landing'
  | 'emergency'

export type AlertSeverity = 'critical' | 'warning' | 'info'

export type AlertKind =
  | 'emergency-stop'
  | 'fault'
  | 'separation'
  | 'no-response'
  | 'obstacle'
  | 'low-endurance'
  | 'uneven-motors'
  | 'battery-low'
  /*
   * Raised by the mission layer rather than by `alertsFor` below, because each needs a
   * Mission to mean anything — there is no such thing as leaving a zone nobody drew.
   * They live in this union so that one Attention queue ranks everything a Teacher has
   * to deal with, rather than two queues competing for the same glance.
   */
  | 'no-fly'
  | 'crash'
  | 'missed-checkpoint'
  | 'mission-timeout'

export interface VitalsAlert {
  readonly kind: AlertKind
  readonly severity: AlertSeverity
  /** What the Teacher should do, not what is true. */
  readonly text: string
  readonly since: number
}

export interface DroneVitals {
  readonly droneId: DroneId
  readonly callsign: string
  readonly status: Status
  readonly phase: FlightPhase
  /**
   * Straight from the airframe, not inferred from phase. A latched emergency stop
   * resolves to `emergency` whether the Drone is on a desk or falling out of the air,
   * so phase cannot answer "is this thing off the ground".
   */
  readonly airborne: boolean
  readonly altitudeM: number | null
  readonly verticalRateMps: number | null
  /** Horizontal speed from position over time; null when the track is not yet long enough. */
  readonly groundSpeedMps: number | null
  readonly batteryFraction: number | null
  readonly enduranceMs: number | null
  readonly responseAgeMs: number | null
  readonly position: LocalPosition | null
  readonly separationM: number | null
  readonly conflictWith: string | null
  readonly alerts: readonly VitalsAlert[]
}

/** Two Drones closer than this are converging; a wall at 1m is not, so the two differ. */
export const SEPARATION_WARNING_M = 1.5
/** Under two minutes of flight left is a "bring it down now" number. */
export const LOW_ENDURANCE_MS = 120_000
/** Spread across the motors beyond which one of them is not pulling its weight. */
export const UNEVEN_THRUST_FRACTION = 0.25
/** Vertical movement below this is noise, not a climb. */
export const VERTICAL_DEADBAND_MPS = 0.25
/** Charge has to be watched for at least this long before a slope means anything. */
export const MIN_ENDURANCE_SPAN_MS = 30_000

const SEVERITY_ORDER: Readonly<Record<AlertSeverity, number>> = {
  critical: 0,
  warning: 1,
  info: 2,
}

export interface VitalsInput {
  readonly state: FleetState
  /** When this snapshot arrived, so an age can count up while it sits on screen. */
  readonly receivedAt: number
  readonly now: number
  readonly batteries: readonly DroneBatteryHistory[]
  /** Metres per second, per Drone. Absent or null when the direction is not yet known. */
  readonly rates: ReadonlyMap<DroneId, number | null>
  /** Horizontal metres per second, per Drone. Absent or null when the track is not yet long enough. */
  readonly groundSpeeds?: ReadonlyMap<DroneId, number | null>
  readonly thresholds?: FleetThresholds
  /**
   * When each condition was first seen, keyed by `alertKey`. Absent for one that has
   * just appeared, which is stamped with `now`.
   *
   * Without this every alert carried the Drone's Last Contact, which moves with every
   * snapshot — so all alerts shared one timestamp and "oldest first" sorted nothing.
   */
  readonly firstSeen?: ReadonlyMap<string, number>
}

/** Identity of a condition, stable while it lasts and reused once it returns. */
export function alertKey(droneId: DroneId, kind: AlertKind): string {
  return `${droneId}:${kind}`
}

export function fleetVitals(input: VitalsInput): readonly DroneVitals[] {
  const thresholds = input.thresholds ?? DEFAULT_THRESHOLDS
  const separation = separations(input.state.drones)

  return input.state.drones.map((drone) => {
    const telemetry = drone.telemetry
    const rate = input.rates.get(drone.id) ?? null
    const groundSpeed = input.groundSpeeds?.get(drone.id) ?? null
    const phase = flightPhase(drone, rate)
    const conflict = separation.get(drone.id) ?? null
    const samples = input.batteries.find((entry) => entry.droneId === drone.id)?.samples ?? []
    const endurance = enduranceMs(samples, thresholds.usableBatteryFraction)
    const responseAge = ageMs(drone, input.state, input.receivedAt, input.now)

    const vitals: DroneVitals = {
      droneId: drone.id,
      callsign: drone.name,
      status: drone.status,
      phase,
      airborne: telemetry?.airborne === true,
      altitudeM: telemetry?.altitudeM ?? null,
      verticalRateMps: rate,
      groundSpeedMps: groundSpeed,
      batteryFraction: telemetry?.batteryFraction ?? null,
      enduranceMs: endurance,
      responseAgeMs: responseAge,
      position: telemetry?.position ?? null,
      separationM: conflict?.metres ?? null,
      conflictWith: conflict?.withCallsign ?? null,
      alerts: [],
    }

    return {
      ...vitals,
      alerts: alertsFor(drone, vitals, thresholds, input.firstSeen ?? EMPTY_FIRST_SEEN, input.now),
    }
  })
}

const EMPTY_FIRST_SEEN: ReadonlyMap<string, number> = new Map()

/**
 * Which situation the aircraft is in, first match winning.
 *
 * A latched emergency stop outranks everything including silence, because releasing it
 * needs someone to walk to the Drone whether or not it is still talking. Below that,
 * knowing nothing outranks guessing.
 */
export function flightPhase(drone: DroneState, verticalRateMps: number | null): FlightPhase {
  const telemetry = drone.telemetry
  if (telemetry?.emergencyStopTriggered) return 'emergency'
  if (drone.status === 'Offline' || telemetry === null) return 'no-contact'
  if (telemetry.autoLanding === 'in-progress') return 'auto-landing'
  if (!telemetry.airborne) return 'on-ground'
  if (verticalRateMps === null) return 'flying'
  if (verticalRateMps > VERTICAL_DEADBAND_MPS) return 'climbing'
  if (verticalRateMps < -VERTICAL_DEADBAND_MPS) return 'descending'
  return 'level'
}

/**
 * How long until the charge reaches the point a Drone stops being usable.
 *
 * Projected from what this airframe has actually done in the last few minutes and from
 * nothing else (ADR-0007). A nameplate endurance figure describes a new battery in a
 * warm room, which is not the battery in the Teacher's hand.
 */
export function enduranceMs(
  samples: readonly { readonly at: number; readonly fraction: number }[],
  usableBatteryFraction: number,
): number | null {
  if (samples.length < 2) return null
  const first = samples[0]!
  const last = samples[samples.length - 1]!
  const span = last.at - first.at
  if (span < MIN_ENDURANCE_SPAN_MS) return null

  const drop = first.fraction - last.fraction
  // Flat or rising means it is sitting still or on charge. Neither has a time to empty,
  // and returning a huge number would read as an unusually good battery.
  if (drop <= 0) return null

  const remaining = last.fraction - usableBatteryFraction
  if (remaining <= 0) return 0
  return (remaining / (drop / span))
}

interface Conflict {
  readonly metres: number
  readonly withCallsign: string
}

/**
 * The nearest other aircraft, for every Drone that is up and reporting where it is.
 *
 * Only airborne Drones count. Six of them parked in a row on a desk are 20cm apart and
 * that is not a conflict, it is a shelf.
 */
export function separations(drones: readonly DroneState[]): ReadonlyMap<DroneId, Conflict> {
  const flying = drones.filter(
    (drone) =>
      drone.status !== 'Offline' &&
      drone.telemetry?.airborne === true &&
      drone.telemetry.position !== undefined,
  )

  const closest = new Map<DroneId, Conflict>()
  for (const drone of flying) {
    for (const other of flying) {
      if (other.id === drone.id) continue
      const a = drone.telemetry!.position!
      const b = other.telemetry!.position!
      const metres = Math.hypot(a.eastM - b.eastM, a.northM - b.northM)
      const existing = closest.get(drone.id)
      if (existing === undefined || metres < existing.metres) {
        closest.set(drone.id, { metres, withCallsign: other.name })
      }
    }
  }
  return closest
}

function alertsFor(
  drone: DroneState,
  vitals: DroneVitals,
  thresholds: FleetThresholds,
  firstSeen: ReadonlyMap<string, number>,
  now: number,
): readonly VitalsAlert[] {
  const telemetry = drone.telemetry
  // Raised without a time; when each condition actually started is attached at the end.
  const alerts: { kind: AlertKind; severity: AlertSeverity; text: string }[] = []
  const airborne = telemetry?.airborne === true

  if (telemetry?.emergencyStopTriggered) {
    alerts.push({
      kind: 'emergency-stop',
      severity: 'critical',
      text: 'Attend the aircraft and release the emergency stop. Motors remain cut until released.',
    })
  }

  if (telemetry?.fault != null) {
    alerts.push({
      kind: 'fault',
      severity: 'critical',
      text: `Withdraw from service. ${telemetry.fault.description}`,
    })
  }

  if (vitals.separationM !== null && vitals.separationM < SEPARATION_WARNING_M) {
    alerts.push({
      kind: 'separation',
      severity: 'critical',
      text: `Increase separation from ${vitals.conflictWith}. ${vitals.separationM.toFixed(1)} m apart.`,
    })
  }

  if (vitals.responseAgeMs !== null && vitals.responseAgeMs > thresholds.staleAfterMs) {
    alerts.push({
      kind: 'no-response',
      // Silence from an aircraft that is up is a different problem from silence from one
      // on a shelf: nobody can see what it is doing and it is still flying.
      severity: airborne ? 'critical' : 'warning',
      // The magnitude goes in the sentence. "Has stopped responding" is true of eleven
      // seconds and of ten minutes, and a Teacher needs to tell those apart at a glance.
      text: airborne
        ? `Airborne with no response for ${Math.round(vitals.responseAgeMs / 1_000)}s. Observe the aircraft directly, not the board.`
        : `No response for ${Math.round(vitals.responseAgeMs / 1_000)}s. Confirm power is on.`,
    })
  }

  const proximity = telemetry?.proximity
  if (proximity != null && proximity.metres < DEFAULT_PROXIMITY_WARNING_M) {
    alerts.push({
      kind: 'obstacle',
      severity: 'warning',
      text: `Increase clearance from the obstruction. ${proximity.metres.toFixed(1)} m.`,
    })
  }

  if (airborne && vitals.enduranceMs !== null && vitals.enduranceMs < LOW_ENDURANCE_MS) {
    alerts.push({
      kind: 'low-endurance',
      severity: 'warning',
      text: 'Land now. Under two minutes of usable charge remaining.',
    })
  }

  const motors = telemetry?.motors
  if (airborne && motors !== undefined && motors.length > 0) {
    const thrusts = motors.map((motor) => motor.thrustFraction)
    const spread = Math.max(...thrusts) - Math.min(...thrusts)
    if (spread > UNEVEN_THRUST_FRACTION) {
      alerts.push({
        kind: 'uneven-motors',
        severity: 'warning',
        text: 'Land and inspect the motors. Thrust is uneven across them.',
        })
    }
  }

  if (
    !airborne &&
    vitals.batteryFraction !== null &&
    vitals.batteryFraction < thresholds.usableBatteryFraction
  ) {
    alerts.push({
      kind: 'battery-low',
      severity: 'info',
      text: 'Place on charge before issue.',
    })
  }

  return sortAlerts(
    alerts.map((alert) => ({
      ...alert,
      since: firstSeen.get(alertKey(drone.id, alert.kind)) ?? now,
    })),
  )
}

/** Worst first, and among equals the one that has been waiting longest. */
export function sortAlerts(alerts: readonly VitalsAlert[]): readonly VitalsAlert[] {
  return [...alerts].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.since - b.since,
  )
}

/**
 * The whole Fleet's alerts in one queue, worst first, minus whatever the Teacher has
 * already taken.
 *
 * Acknowledgement arrives as a predicate rather than as a store, so everything derived
 * here stays a pure function of the Fleet. What a Teacher has seen is a fact about the
 * Teacher, and it has no business inside the reasoning about what a Drone is doing.
 */
export function alertQueue(
  vitals: readonly DroneVitals[],
  acknowledged: (droneId: DroneId, alert: VitalsAlert) => boolean = () => false,
): readonly (VitalsAlert & { readonly callsign: string; readonly droneId: DroneId })[] {
  const all = vitals.flatMap((entry) =>
    entry.alerts
      .filter((alert) => !acknowledged(entry.droneId, alert))
      .map((alert) => ({ ...alert, callsign: entry.callsign, droneId: entry.droneId })),
  )
  return [...all].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.since - b.since,
  )
}

/**
 * When each condition began, so an alert can say how long it has been waiting.
 *
 * A condition that clears forgets its start time. If the same Drone raises the same
 * alert again an hour later that is new news, not something that has been outstanding
 * all lesson, and a queue sorted oldest-first would otherwise pin it to the top forever.
 */
export class AlertTracker {
  readonly #firstSeen = new Map<string, number>()

  observe(vitals: readonly DroneVitals[], at: number): void {
    const live = new Set<string>()
    for (const entry of vitals) {
      for (const alert of entry.alerts) {
        const key = alertKey(entry.droneId, alert.kind)
        live.add(key)
        if (!this.#firstSeen.has(key)) this.#firstSeen.set(key, at)
      }
    }
    for (const key of [...this.#firstSeen.keys()]) {
      if (!live.has(key)) this.#firstSeen.delete(key)
    }
  }

  get firstSeen(): ReadonlyMap<string, number> {
    return this.#firstSeen
  }

  reset(): void {
    this.#firstSeen.clear()
  }
}

/**
 * Vertical rate, kept as a small ring of altitude readings per Drone.
 *
 * Samples are stamped with the Drone's own Last Contact rather than with the moment this
 * ran, so a Drone that stops responding stops producing a rate instead of appearing to
 * level off. Two readings from the same contact moment carry no time between them and
 * cannot yield a rate.
 */
export class AltitudeTracker {
  readonly #tracks = new Map<DroneId, { at: number; altitudeM: number }[]>()
  readonly #windowMs: number

  constructor(windowMs = 10_000) {
    this.#windowMs = windowMs
  }

  observe(state: FleetState): void {
    for (const drone of state.drones) {
      const altitudeM = drone.telemetry?.altitudeM
      const at = drone.lastContact
      if (altitudeM === undefined || at === null) continue

      const track = this.#tracks.get(drone.id) ?? []
      if (track.length > 0 && track[track.length - 1]!.at === at) continue
      track.push({ at, altitudeM })
      while (track.length > 1 && at - track[0]!.at > this.#windowMs) track.shift()
      this.#tracks.set(drone.id, track)
    }
  }

  rates(): ReadonlyMap<DroneId, number | null> {
    const rates = new Map<DroneId, number | null>()
    for (const [droneId, track] of this.#tracks) {
      rates.set(droneId, rateOf(track))
    }
    return rates
  }

  reset(): void {
    this.#tracks.clear()
  }
}

function rateOf(track: readonly { at: number; altitudeM: number }[]): number | null {
  if (track.length < 2) return null
  const first = track[0]!
  const last = track[track.length - 1]!
  const seconds = (last.at - first.at) / 1_000
  if (seconds <= 0) return null
  return (last.altitudeM - first.altitudeM) / seconds
}

/**
 * Ground speed, kept as a small ring of position readings per Drone.
 *
 * Samples are stamped with the Drone's own Last Contact rather than with the moment this
 * ran, so a Drone that stops responding stops producing a speed instead of appearing to
 * coast. Two readings from the same contact moment carry no time between them and cannot
 * yield a rate.
 */
export class GroundSpeedTracker {
  readonly #tracks = new Map<DroneId, { at: number; eastM: number; northM: number }[]>()
  readonly #windowMs: number

  constructor(windowMs = 10_000) {
    this.#windowMs = windowMs
  }

  observe(state: FleetState): void {
    for (const drone of state.drones) {
      const position = drone.telemetry?.position
      const at = drone.lastContact
      if (position === undefined || at === null) continue

      const track = this.#tracks.get(drone.id) ?? []
      if (track.length > 0 && track[track.length - 1]!.at === at) continue
      track.push({ at, eastM: position.eastM, northM: position.northM })
      while (track.length > 1 && at - track[0]!.at > this.#windowMs) track.shift()
      this.#tracks.set(drone.id, track)
    }
  }

  speeds(): ReadonlyMap<DroneId, number | null> {
    const speeds = new Map<DroneId, number | null>()
    for (const [droneId, track] of this.#tracks) {
      speeds.set(droneId, groundSpeedOf(track))
    }
    return speeds
  }

  reset(): void {
    this.#tracks.clear()
  }
}

function groundSpeedOf(
  track: readonly { at: number; eastM: number; northM: number }[],
): number | null {
  if (track.length < 2) return null
  const first = track[0]!
  const last = track[track.length - 1]!
  const seconds = (last.at - first.at) / 1_000
  if (seconds <= 0) return null
  const metres = Math.hypot(last.eastM - first.eastM, last.northM - first.northM)
  return metres / seconds
}
