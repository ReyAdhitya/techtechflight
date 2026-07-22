/**
 * The contract between the ground station and the dashboard.
 *
 * This package is the only thing the two programs share (ADR-0003). Nothing here may
 * mention a radio, a port, a wire format, or a protocol: those live behind the
 * Telemetry Source seam (ADR-0001), and anything drone-specific leaking into this file
 * is a defect.
 */

/** Stable identity for one Drone. Survives being powered off. */
export type DroneId = string

/**
 * The single summary state of a Drone. Derived by the ground station, never reported
 * by a Telemetry Source.
 */
export type Status = 'Offline' | 'Ready' | 'Not Ready' | 'Flying' | 'Fault'

/** The two Statuses the board groups together as Needs Attention. */
export const NEEDS_ATTENTION: readonly Status[] = ['Not Ready', 'Fault']

/** Something wrong that the Teacher cannot resolve before the lesson. */
export interface FaultReport {
  /** Short machine-facing code, e.g. `IMU_CALIBRATION`. */
  readonly code: string
  /** Plain sentence a Teacher can read out when asking for help. */
  readonly description: string
}

/**
 * Measurements reported by a Drone about itself. `extra` carries whatever else the
 * aircraft can sense, so the detail view can show everything reported without this
 * type having to enumerate it.
 */
export interface Telemetry {
  /** Battery as a proportion, 0..1 — never a raw voltage. */
  readonly batteryFraction: number
  /**
   * True when the hardware cannot measure charge precisely and the fraction is
   * inferred. The board marks these so a Teacher does not over-trust the number.
   */
  readonly batteryIsEstimate: boolean
  readonly airborne: boolean
  readonly fault: FaultReport | null
  readonly extra?: Readonly<Record<string, string | number | boolean>>
}

/** One raw observation from a Telemetry Source, keyed by Drone identity. */
export interface TelemetryObservation {
  readonly droneId: DroneId
  readonly telemetry: Telemetry
}

export type Unsubscribe = () => void

/**
 * The sole boundary between hardware concerns and everything else (ADR-0001).
 *
 * A Telemetry Source reports observations and lifecycle. It has no opinion about
 * Status, and exposes no radios, ports, connection strings, or protocol detail.
 * Adding real hardware later means writing one new implementation of this interface.
 */
export interface TelemetrySource {
  connect(): void | Promise<void>
  disconnect(): void | Promise<void>
  onObservation(listener: (observation: TelemetryObservation) => void): Unsubscribe
}

/**
 * Time as an injected dependency, never an ambient capability.
 *
 * Stale and Offline are the most important and most fragile logic in the product. With
 * a real clock every test of them becomes a sleep and the suite goes flaky within a
 * week, so scheduling is injected alongside `now`.
 */
export interface Clock {
  /** Milliseconds since the epoch. */
  now(): number
  /** Repeating timer. Returns a cancel function. */
  setInterval(callback: () => void, intervalMs: number): Unsubscribe
  /** One-shot timer. Returns a cancel function. */
  setTimeout(callback: () => void, delayMs: number): Unsubscribe
}

/** A Drone the School owns, whether or not it has ever been heard from. */
export interface DroneRegistration {
  readonly id: DroneId
  /** Short human-readable name a Teacher can match to the object in their hands. */
  readonly name: string
  /**
   * Fixed place on the board. Ordering is by this value and never by Status, so a
   * Teacher builds muscle memory for where each Drone appears.
   */
  readonly boardOrder: number
}

/** Everything the board knows about one Drone. */
export interface DroneState {
  readonly id: DroneId
  readonly name: string
  readonly status: Status
  /**
   * Last known Telemetry, or null when the Drone has never been heard from. Retained
   * while Offline so yesterday's reading stays useful — it is always displayed with
   * its age and never as though it were current.
   */
  readonly telemetry: Telemetry | null
  /**
   * When Telemetry was last received, in epoch milliseconds. Null distinguishes
   * "never heard from" from "not heard from recently"; a newly added Drone and a
   * failed one must not look identical.
   */
  readonly lastContact: number | null
  /** True when Telemetry is old enough that it may no longer be true. */
  readonly stale: boolean
  /**
   * How long until this Drone is expected to reach a usable charge, in milliseconds, or
   * null whenever the ground station cannot honestly say.
   *
   * Derived from observed charge alone: the battery has to have been seen actually
   * rising across several readings before anything is claimed. A Fleet whose batteries
   * are swapped rather than charged in place therefore reports null here forever, and
   * that is the correct answer rather than a missing feature — the charger is a device
   * no Drone can see, so no honest forecast exists. Null is the resting value; a Teacher
   * is never shown a number the Telemetry cannot support.
   *
   * Rounded to the minute it is displayed in, because an extrapolation does not deserve
   * second precision and a value that changed every tick would republish the Fleet
   * without a Teacher ever seeing it change.
   */
  readonly timeToReadyMs: number | null
}

/**
 * A full description of the Fleet, not a delta stream. Fleets are small, the payload
 * is trivial, and sending the whole thing removes an entire class of
 * divergence-between-client-and-server bugs.
 */
export interface FleetState {
  /** In stable board order. */
  readonly drones: readonly DroneState[]
  /** The ground station's clock reading when this snapshot was built. */
  readonly generatedAt: number
}

/** Time and battery limits that drive Status derivation. All configurable. */
export interface FleetThresholds {
  /** Silence after which Telemetry is Stale — displayed, but marked with its age. */
  readonly staleAfterMs: number
  /** Longer silence after which the Drone is Offline. */
  readonly offlineAfterMs: number
  /** Battery at or above this fraction is enough to fly a lesson. */
  readonly usableBatteryFraction: number
}

export const DEFAULT_THRESHOLDS: FleetThresholds = {
  staleAfterMs: 10_000,
  offlineAfterMs: 60_000,
  usableBatteryFraction: 0.3,
}

/** The only message the ground station sends. The dashboard treats it as read-only. */
export interface FleetStateMessage {
  readonly type: 'fleet-state'
  readonly state: FleetState
}

export type ServerMessage = FleetStateMessage

/** True when this Drone belongs in the Needs Attention bucket. */
export function needsAttention(status: Status): boolean {
  return NEEDS_ATTENTION.includes(status)
}

/**
 * True when a Teacher can hand this Drone to a Student right now. Flying Drones are
 * in use rather than available, so they count as neither usable nor needing attention.
 */
export function isUsable(status: Status): boolean {
  return status === 'Ready'
}
