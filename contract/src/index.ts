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

/** Thrust on one motor, in the airframe's own naming. */
export interface MotorReading {
  /** Whatever the aircraft calls it — `front-left`, `1`, `M3`. */
  readonly id: string
  /** Commanded thrust as a proportion, 0..1. Never raw PWM or RPM. */
  readonly thrustFraction: number
  readonly temperatureC?: number
}

/** How the airframe is sitting, in degrees. */
export interface Orientation {
  /** Nose up positive. */
  readonly pitchDegrees: number
  /** Right wing down positive. */
  readonly rollDegrees: number
  /** Clockwise from north. */
  readonly yawDegrees: number
}

/**
 * Whether the aircraft can bring itself down, and whether it is doing so.
 *
 * `unsupported` and `unavailable` are deliberately different: an airframe that has no
 * auto-landing at all is a permanent fact about the Fleet, where one that cannot do it
 * *right now* is a condition that will pass. Collapsing them would leave a Teacher
 * unable to tell "this Drone never could" from "not while it is doing that".
 */
export type AutoLandingState = 'unsupported' | 'unavailable' | 'ready' | 'in-progress'

/** Whether a camera is aboard, and whether it is sending pictures. */
export interface CameraState {
  readonly streaming: boolean
}

/**
 * How well the radio is carrying, as a proportion 0..1 — never a raw RSSI.
 *
 * A different fact from Last Contact, and both are needed. Last Contact says when we last
 * heard anything; this says how well we are hearing it *now*. A Drone at the far end of a
 * hall can be answering every second on a link about to fail, and only this reading sees
 * that coming.
 *
 * Absent when the link cannot describe itself, which is the common case — most radios
 * report the aircraft and not the path to it.
 */
export type LinkQuality = number

/** The nearest thing the Drone can see. */
export interface ProximityReading {
  readonly metres: number
  /** Degrees clockwise from the nose, or null when the sensor cannot say where. */
  readonly bearingDegrees: number | null
}

/**
 * Where a Drone is, relative to where the Fleet was set up rather than to the planet.
 *
 * A classroom is a room, not a map. Metres from the corner the Teacher started in are
 * something they can act on; a latitude is not.
 */
export interface LocalPosition {
  readonly eastM: number
  readonly northM: number
}

/**
 * Measurements reported by a Drone about itself.
 *
 * Everything below `fault` is optional, and the distinction between *absent* and *null*
 * carries meaning throughout: **undefined means this Drone cannot report it at all**
 * (no sensor, older firmware), while **null means it can and there is nothing to
 * report**. A Drone with no rangefinder and a Drone with clear air around it are not
 * the same fact, and the board must never draw them the same way — the same rule that
 * keeps a Drone that has never responded from looking like a flat one.
 *
 * `extra` remains the escape hatch for anything the aircraft senses that this type has
 * not yet learned about, so a new reading reaches the detail view without a contract
 * change.
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

  /** Height above the point this Drone took off from, in metres. */
  readonly altitudeM?: number
  readonly orientation?: Orientation
  /** Empty when the aircraft reports thrust but has no per-motor breakdown. */
  readonly motors?: readonly MotorReading[]
  /**
   * True while the emergency cut-out is latched. This is a Fault the moment it is
   * true — an aircraft that has been cut is not one a Student takes to the next table.
   */
  readonly emergencyStopTriggered?: boolean
  readonly autoLanding?: AutoLandingState
  readonly camera?: CameraState
  /** How well the radio is carrying, 0..1. Absent when the link cannot describe itself. */
  readonly linkQuality?: LinkQuality
  /** Null when the sensor is fitted and sees nothing close. */
  readonly proximity?: ProximityReading | null
  readonly position?: LocalPosition
  /**
   * Which linked group this Drone is flying as part of, when Drones have been linked
   * together. Null when it is flying on its own.
   */
  readonly linkGroupId?: string | null

  readonly extra?: Readonly<Record<string, string | number | boolean>>
}

/**
 * How close is too close.
 *
 * A number rather than a Status: the board decides how to draw it, and the ground
 * station decides nothing about it at all — a rangefinder reports metres, and what
 * counts as alarming is a property of the room the Fleet is flying in.
 */
export const DEFAULT_PROXIMITY_WARNING_M = 1

/** True when this reading is close enough that a Teacher should be told. */
export function isTooClose(
  proximity: ProximityReading | null | undefined,
  warnBelowM: number = DEFAULT_PROXIMITY_WARNING_M,
): boolean {
  return proximity != null && proximity.metres <= warnBelowM
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

/* --- Asking a Drone to do something ---------------------------------------
 *
 * Every Command ends with the aircraft on the ground or staying where it is. Land, hold,
 * auto-land, stop, return home. **No Command takes off, climbs, goes faster, or chooses a
 * new destination** — a Teacher does not launch a Student's Drone from across the room, and
 * a `goto` would be a genuine expansion of what they can make an aircraft do.
 *
 * That is what makes the whole surface fail safe by construction: the worst outcome of a
 * mistaken Command is an aircraft that comes down when it did not need to.
 *
 * The rule was first written as "every Command reduces the aircraft's energy", which was
 * shorthand for the same thing and read as arithmetic once `return-home` arrived — it flies
 * a short path to the one place in the room known to be clear, and then lands. Rewritten
 * rather than deleted (ADR-0022), because the reasoning is still the constraint and losing
 * it is how the next person adds `goto`.
 */

export type CommandKind = 'land' | 'hold' | 'auto-land' | 'emergency-stop' | 'return-home'

export interface DroneCommand {
  /** Generated by the board, so an outcome can be matched to the request that caused it. */
  readonly id: string
  readonly droneId: DroneId
  readonly kind: CommandKind
  readonly issuedAt: number
}

/**
 * A Telemetry Source that will accept a Command.
 *
 * Deliberately separate from `TelemetrySource`, and deliberately optional. Only the
 * simulator implements it (ADR-0011): a hardware adapter cannot accept a Command by
 * forgetting to guard against one, but only by someone writing this interface's name,
 * which is a code review rather than a configuration change.
 *
 * There is no flag that turns this on. A flag is a thing a person switches under time
 * pressure, in a school, to make a demonstration work.
 */
export interface CommandableSource {
  command(command: DroneCommand): void
}

export function isCommandable(
  source: TelemetrySource,
): source is TelemetrySource & CommandableSource {
  return typeof (source as Partial<CommandableSource>).command === 'function'
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

/** A Drone the School owns, whether or not it has ever responded. */
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
   * Last known Telemetry, or null when the Drone has never responded. Retained
   * while Offline so yesterday's reading stays useful — it is always displayed with
   * its age and never as though it were current.
   */
  readonly telemetry: Telemetry | null
  /**
   * When Telemetry was last received, in epoch milliseconds. Null distinguishes
   * "never responded" from "without a recent response"; a newly added Drone and a
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

/* --- What happened, and when ---------------------------------------------
 *
 * Fleet State answers "what is true now". It cannot answer "did Drone 3 fault twice
 * this morning", which is the question a Teacher asks the moment the lesson is over
 * and the question that decides which Drone goes back in the cupboard.
 *
 * History is derived by the ground station and never by a board: the ground station is
 * the only thing that sees every reading, and two boards open on one Fleet must not
 * disagree about what happened. It travels over the same socket as a plain snapshot,
 * so the board stays as read-only as ADR-0003 left it.
 */

/**
 * What changed, in the words a Teacher would use.
 *
 * Exactly one is emitted per Drone per transition. They are deliberately not a
 * transcription of the Status table — `landed` and `took-off` say what the aircraft
 * did, where a bare "Flying → Ready" makes a Teacher do the translation themselves.
 */
export type FleetEventKind =
  | 'first-contact'
  | 'contact-lost'
  | 'contact-restored'
  | 'took-off'
  | 'landed'
  | 'fault-raised'
  | 'fault-cleared'
  | 'charge-low'
  | 'became-ready'

/**
 * How loudly an event should read in a timeline.
 *
 * The same two-tier split the board already makes (ADR-0004): amber is a Teacher with
 * charging to do, coral is a Drone leaving the set. Everything else is the Fleet going
 * about its day and must not compete with either.
 */
export type EventSeverity = 'routine' | 'attention' | 'fault'

export interface FleetEvent {
  /** Stable and derived, so the same transition never lands twice. */
  readonly id: string
  /** The ground station's clock reading when the change was observed. */
  readonly at: number
  readonly droneId: DroneId
  /**
   * Denormalised deliberately. A Drone removed from the Fleet still has to be readable
   * in yesterday's timeline, and a history full of bare ids is not a record anyone can
   * use.
   */
  readonly droneName: string
  readonly kind: FleetEventKind
  /** Null on `first-contact`, where there is no previous Status to name. */
  readonly from: Status | null
  readonly to: Status
  /** A fault's description, or whatever else the sentence needs. Null when it needs none. */
  readonly detail: string | null
  readonly severity: EventSeverity
}

/** One battery reading, retained so a charge can be seen going in rather than inferred. */
export interface BatterySample {
  readonly at: number
  readonly fraction: number
}

export interface DroneBatteryHistory {
  readonly droneId: DroneId
  /** Oldest first. Thinned by time, so a long window stays a fixed size. */
  readonly samples: readonly BatterySample[]
}

/**
 * Everything the ground station has retained about the recent past.
 *
 * Bounded rather than complete: this process runs for the length of a school day on a
 * Teacher's laptop, and an unbounded log would be a memory leak with a nice name.
 * `since` says how far back the answer is trustworthy, so a board can say "in the last
 * two hours" instead of implying it knows about last week.
 */
export interface FleetHistory {
  /** Oldest first. */
  readonly events: readonly FleetEvent[]
  readonly batteries: readonly DroneBatteryHistory[]
  /** Earliest moment covered. Nothing before this was kept. */
  readonly since: number
}

/** The current snapshot. Sent on connect and whenever the Fleet changes. */
export interface FleetStateMessage {
  readonly type: 'fleet-state'
  readonly state: FleetState
}

/** Everything retained about the recent past. Sent once, on connect. */
export interface FleetHistoryMessage {
  readonly type: 'fleet-history'
  readonly history: FleetHistory
}

/** What has happened since. Sent as it happens, so a board never has to poll. */
export interface FleetEventsMessage {
  readonly type: 'fleet-events'
  readonly events: readonly FleetEvent[]
}

/** Whether a Command reached the Fleet at all. Not whether the Drone did anything. */
export interface CommandOutcomeMessage {
  readonly type: 'command-outcome'
  readonly commandId: string
  readonly outcome: 'accepted' | 'refused'
  /** Why not, in words a Teacher can read. Null when it was accepted. */
  readonly reason: string | null
}

/**
 * The messages the ground station sends.
 *
 * This union was, for a long time, the only one there was: the board read and never
 * spoke. That rule had three reasons and only one of them has changed. There is still no
 * protocol for commanding an aircraft, and there are still children in the room — both of
 * which are facts about hardware. The third reason was about us, and it holds completely:
 * a command path is exactly the kind of thing that arrives as a demonstration affordance
 * and stays as an API, which is why the ground station's own scenario keys are bound to
 * its stdin rather than to a socket (see `ground-station/src/main.ts`).
 *
 * So `ClientMessage` exists, and it is a separate union from this one rather than an
 * addition to it, so the two directions can never be mistaken for one another. What
 * travels along it reaches a simulated Fleet and refuses to reach any other kind
 * (ADR-0011).
 */
export type ServerMessage =
  | FleetStateMessage
  | FleetHistoryMessage
  | FleetEventsMessage
  | CommandOutcomeMessage

/** A Command, on its way to whatever owns the Fleet. The only thing a board ever sends. */
export interface CommandMessage {
  readonly type: 'command'
  readonly command: DroneCommand
}

export type ClientMessage = CommandMessage

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
