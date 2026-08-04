import type { DroneVitals } from './vitals.ts'
import type { AirspaceBreach } from './airspace.ts'
import { hasReached, type Mission } from './mission.ts'

/**
 * How far a Drone has got through its Mission (ADR-0020).
 *
 * A third vocabulary, beside `Status` ("can I hand this out") and `FlightPhase` ("what is
 * the aircraft doing"). This one answers "how is the Mission going", and it is the only
 * one of the three that needs a Mission to exist.
 *
 * **Derived, and never optimistic.** Pressing Recall does not move a Drone to Returning;
 * Telemetry showing it coming home does. Granting a Clearance does not make a Drone take
 * off. That is ADR-0011's rule about Commands applied to the state they produce, and the
 * failure it prevents is a screen that shows a Drone obeying an order it ignored.
 */

/** The ordinary run, in order. Photo 5's eleven, unchanged. */
export type MissionPhase =
  | 'standby'
  | 'pre-flight'
  | 'awaiting-clearance'
  /**
   * Cleared, and still on the ground.
   *
   * The twelfth state, and the only place this departs from the customer's eleven. Their
   * lifecycle goes straight from Await Takeoff Approval to Takeoff, which is right when a
   * machine launches itself and wrong here: a Student flies the aircraft, so approval and
   * launch are separated by however long it takes a team to be ready. Collapsing them
   * would make a cleared team that has not moved indistinguishable from one still waiting
   * on the Teacher — which is exactly the queue the Teacher is working through.
   */
  | 'cleared'
  | 'takeoff'
  | 'stabilising'
  | 'in-mission'
  | 'checkpoint-progress'
  | 'task-complete'
  | 'returning'
  | 'landing'
  | 'finished'

/**
 * Something happening *while* the Mission runs.
 *
 * Deliberately not peers of the eleven. A Drone avoiding an obstacle is still in mission,
 * and flattening the two would lose where it resumes — which is the question a Teacher
 * asks the moment the obstacle is behind it.
 */
export type MissionException =
  | 'paused'
  | 'new-target'
  | 'reprioritised'
  | 'avoiding'
  | 'low-battery'
  | 'no-fly'
  | 'lost-link'
  | 'recovering'
  | 'failed'

export interface MissionPhaseReading {
  readonly phase: MissionPhase
  readonly exception: MissionException | null
  /** How many required checkpoints are behind this Drone, and how many there are. */
  readonly checkpointsReached: number
  readonly checkpointsRequired: number
}

export const PHASE_WORDS: Readonly<Record<MissionPhase, string>> = {
  standby: 'Standby',
  'pre-flight': 'Pre-flight check',
  'awaiting-clearance': 'Awaiting clearance',
  cleared: 'Cleared for takeoff',
  takeoff: 'Takeoff',
  stabilising: 'Climbing',
  'in-mission': 'In mission',
  'checkpoint-progress': 'On task',
  'task-complete': 'Task complete',
  returning: 'Returning home',
  landing: 'Landing',
  finished: 'Mission finished',
}

export const EXCEPTION_WORDS: Readonly<Record<MissionException, string>> = {
  paused: 'Holding position',
  'new-target': 'Retasked',
  reprioritised: 'Reprioritised',
  avoiding: 'Avoiding an obstacle',
  'low-battery': 'Charge low',
  'no-fly': 'Out of bounds',
  'lost-link': 'Link lost',
  recovering: 'Recovering',
  failed: 'Mission failed',
}

export interface MissionPhaseInput {
  readonly vitals: DroneVitals
  readonly mission: Mission | null
  /** The Teacher has ticked this Drone's pre-flight check. */
  readonly preFlightDone: boolean
  /** The Teacher has cleared this Drone's team to take off. */
  readonly cleared: boolean
  /**
   * Whether the Drone is measurably getting nearer to where it took off.
   *
   * Passed in rather than derived here, because it needs two positions and this function
   * sees one. `null` means not enough track to say — which is the honest answer for the
   * first second after a Recall, and stays the answer for an airframe that cannot report
   * where it is.
   *
   * A Recall being *asked for* is deliberately not an input. A Drone that was told to come
   * home and is still hovering must read as In mission, because that is what it is doing,
   * and it is the only way a Teacher notices it did not obey (ADR-0011).
   */
  readonly closingOnHome: boolean | null
  /** A Hold has been asked for. Same. */
  readonly holdRequested: boolean
  readonly breaches: readonly AirspaceBreach[]
  /** The Teacher has confirmed this Mission complete. */
  readonly confirmedComplete: boolean
  /** The phase this Drone was last known to be in, kept when it falls silent. */
  readonly lastKnown?: MissionPhase
}

/**
 * What is happening to one Drone's Mission.
 *
 * Order matters here and is the whole design. Finished outranks everything because a
 * Teacher confirmed it; a silent Drone keeps what it had rather than being invented into
 * a new state; and the airborne cases are read from the aircraft rather than from what was
 * asked of it.
 */
export function missionPhaseFor(input: MissionPhaseInput): MissionPhaseReading {
  const { vitals, mission } = input

  const required = mission?.checkpoints.filter((c) => c.required) ?? []
  const reached = required.filter((c) => hasReached(c, vitals.position)).length
  const counts = { checkpointsReached: reached, checkpointsRequired: required.length }

  const reading = (
    phase: MissionPhase,
    exception: MissionException | null = null,
  ): MissionPhaseReading => ({ phase, exception, ...counts })

  // The Teacher said so. Nothing the aircraft does afterwards reopens it.
  if (input.confirmedComplete) return reading('finished')

  /*
   * Silence. The Drone keeps whatever it was last known to be doing, with its age shown
   * elsewhere — it does not become "Lost link" as a *phase*, because where it had got to
   * is still the last thing anybody knew and losing that would lose the Mission.
   *
   * Falling back to Standby would be worse than useless: it would say a Drone that is
   * probably still airborne is on the bench.
   */
  if (vitals.phase === 'no-contact') {
    return reading(input.lastKnown ?? 'standby', 'lost-link')
  }

  if (vitals.phase === 'emergency') return reading('landing', 'recovering')

  if (!vitals.airborne) {
    /*
     * On the ground, and which of the four ground states depends on records only — none
     * of this is anything Telemetry could report.
     *
     * No Mission is checked first and outranks the rest. A Clearance is permission to fly
     * *a Mission*, so a stale one left over from a finished Lesson must not make a Drone
     * on a shelf read as cleared for something that no longer exists.
     */
    if (!mission) return reading('standby')
    if (input.cleared) return reading('cleared')
    if (input.preFlightDone) return reading('awaiting-clearance')
    return reading('pre-flight')
  }

  // --- Airborne. Everything below is read from the aircraft. ------------------------

  const exception = airborneException(input)

  /*
   * Returning and Landing are read from Telemetry, not from the Command that asked for
   * them. This ordering is the whole of ADR-0011's rule in three lines.
   */
  if (vitals.phase === 'descending' || vitals.phase === 'auto-landing') {
    return reading('landing', exception)
  }

  if (input.closingOnHome === true) return reading('returning', exception)

  if (vitals.phase === 'climbing') {
    // Takeoff and Climb come free from the vertical rate the board already derives.
    return reading(reached === 0 ? 'takeoff' : 'stabilising', exception)
  }

  if (required.length > 0 && reached >= required.length) {
    return reading('task-complete', exception)
  }

  if (reached > 0) return reading('checkpoint-progress', exception)

  return reading('in-mission', exception)
}

/**
 * The worst thing happening to an airborne Drone right now, or nothing.
 *
 * Ordered by the customer's safety priorities: people first, then the airspace rules, then
 * the aircraft, then the Mission. Being out of bounds outranks a low charge because one of
 * them is about where a Drone is relative to a class of children.
 */
function airborneException(input: MissionPhaseInput): MissionException | null {
  if (input.breaches.length > 0) return 'no-fly'

  const alerts = input.vitals.alerts
  if (alerts.some((alert) => alert.kind === 'obstacle' || alert.kind === 'separation')) {
    return 'avoiding'
  }
  if (alerts.some((alert) => alert.kind === 'low-endurance' || alert.kind === 'battery-low')) {
    return 'low-battery'
  }

  // A Hold is the one exception read from the request, because "not moving" is not
  // distinguishable from "asked to stop moving" by watching alone.
  if (input.holdRequested && input.vitals.phase === 'level') return 'paused'

  return null
}

/** Whether this reading means the Mission is over for this Drone. */
export function isMissionOver(reading: MissionPhaseReading): boolean {
  return reading.phase === 'finished'
}
