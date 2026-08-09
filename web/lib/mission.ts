import type { DroneId, LocalPosition } from '@techtechflight/contract'
import type { Zone } from './airspace.ts'

/**
 * A Mission — one run of a Mission Scenario inside a Lesson (ADR-0018).
 *
 * Everything here is **written by the Teacher**. No Drone reports which Scenario it is
 * flying, where the boundary is, or whether the objective was met, and none ever will.
 * That is why a Mission lives in the Logbook beside Assignment rather than in `contract/`:
 * putting it on the wire would invite a future hardware adapter to try to fill it in.
 */

/** The three that ship, plus whatever a Teacher writes for their own class. */
export type ScenarioId = 'search-rescue' | 'delivery' | 'building-inspection' | (string & {})

/**
 * The five things a Mission is judged to have done.
 *
 * Taken from the customer's own lifecycle rather than invented, so a score can be read
 * against the document a School was sold. Each is either met, not met, or unknown — and
 * unknown is a real answer, because a Mission flown with no zones drawn genuinely cannot
 * say whether the route was safe.
 */
export type SuccessCriterion =
  | 'tasks-completed'
  | 'safe-route'
  | 'no-collisions'
  | 'no-no-fly-violations'
  | 'procedures-followed'

/** The five ways a Mission ends badly. Also the customer's, also unchanged. */
export type FailureCondition =
  | 'mission-timeout'
  | 'crash'
  | 'battery-exhausted'
  | 'control-link-lost'
  | 'missed-required-target'

export const SUCCESS_CRITERIA: readonly SuccessCriterion[] = [
  'tasks-completed',
  'safe-route',
  'no-collisions',
  'no-no-fly-violations',
  'procedures-followed',
]

export const FAILURE_CONDITIONS: readonly FailureCondition[] = [
  'mission-timeout',
  'crash',
  'battery-exhausted',
  'control-link-lost',
  'missed-required-target',
]

/** What each reads as on screen. Never the identifier — those are for code. */
export const CRITERION_WORDS: Readonly<Record<SuccessCriterion, string>> = {
  'tasks-completed': 'Required tasks completed',
  'safe-route': 'Safe route followed',
  'no-collisions': 'No collisions or incidents',
  'no-no-fly-violations': 'No no-fly violations',
  'procedures-followed': 'Correct procedures followed',
}

export const FAILURE_WORDS: Readonly<Record<FailureCondition, string>> = {
  'mission-timeout': 'Ran out of time',
  crash: 'Possible hard landing',
  'battery-exhausted': 'Charge exhausted',
  'control-link-lost': 'Control link lost',
  'missed-required-target': 'Required target missed',
}

/**
 * A place a Mission requires a Drone to reach, in order.
 *
 * `radiusM` is how near counts as reached, and it is generous on purpose: a Student flying
 * by hand cannot hit a point, and a checkpoint that demanded precision would be measuring
 * the controller rather than the lesson.
 */
export interface MissionCheckpoint {
  readonly id: string
  readonly name: string
  readonly at: LocalPosition
  readonly radiusM: number
  /** A Mission can be finished without an optional checkpoint. */
  readonly required: boolean
}

/**
 * The thing a Scenario is looking for — the casualty in Search and Rescue, the doorstep in
 * Delivery, a facade in Inspection.
 *
 * Separate from a checkpoint because reaching a place and *finding* something are
 * different claims, and only the second can be satisfied by the camera.
 */
export interface MissionTarget {
  readonly id: string
  readonly name: string
  readonly at: LocalPosition | null
  /** What a detector would have to see. Null where finding it is a human judgement. */
  readonly detectionLabel: string | null
}

/** How a Mission ended, once the Teacher has confirmed it. */
export interface MissionOutcome {
  readonly endedAt: number
  readonly criteria: Readonly<Record<SuccessCriterion, boolean | null>>
  readonly failures: readonly FailureCondition[]
  /** 0..1, or null when too little was measured to say (ADR-0007's rule, applied here). */
  readonly score: number | null
  readonly debrief: string | null
}

export interface Mission {
  readonly id: string
  readonly scenarioId: ScenarioId
  /** What the Teacher called this run. Falls back to the Scenario's name. */
  readonly name: string
  readonly startedAt: number | null
  /** Minutes the Scenario allows. Null means the Teacher is not running a clock. */
  readonly limitMinutes: number | null
  readonly zones: readonly Zone[]
  readonly checkpoints: readonly MissionCheckpoint[]
  readonly targets: readonly MissionTarget[]
  /** Which Drones are flying this Mission, by team. */
  readonly droneIds: readonly DroneId[]
  readonly outcome: MissionOutcome | null
}

/** A Mission with nothing decided yet — what the Scenario picker starts from. */
export function emptyMission(id: string, scenarioId: ScenarioId, name: string): Mission {
  return {
    id,
    scenarioId,
    name,
    startedAt: null,
    limitMinutes: null,
    zones: [],
    checkpoints: [],
    targets: [],
    droneIds: [],
    outcome: null,
  }
}

/**
 * Whether a Mission has enough on it to fly.
 *
 * Deliberately short. Something to do and a Drone to do it with is the whole requirement:
 * asking for more before the first take-off would make the setup a form rather than a plan,
 * and a Teacher with a class waiting will skip a form.
 *
 * *Draw the Mission Zone* used to be the first line here, and it went with the go-area
 * (ADR-0027). No-fly Zones are not asked for in its place: a room with nothing to stay out of
 * is a real room, and a requirement a Teacher cannot satisfy is worse than no requirement.
 *
 * Returns the reasons rather than a boolean, because a screen that says "not ready" and
 * nothing else is the thing this product exists not to be.
 */
export function whatIsMissing(mission: Mission): readonly string[] {
  const missing: string[] = []

  if (mission.checkpoints.length === 0 && mission.targets.length === 0) {
    missing.push('Add a checkpoint or a target, so there is something to do.')
  }

  if (mission.droneIds.length === 0) missing.push('Assign at least one Drone.')

  return missing
}

export function isReadyToFly(mission: Mission): boolean {
  return whatIsMissing(mission).length === 0
}

/**
 * Whether a Drone has reached a checkpoint.
 *
 * Position is optional on Telemetry — an airframe that cannot say where it is cannot be
 * scored on getting anywhere, and this returns false rather than guessing.
 */
export function hasReached(
  checkpoint: MissionCheckpoint,
  position: LocalPosition | null | undefined,
): boolean {
  if (!position) return false
  return (
    Math.hypot(position.eastM - checkpoint.at.eastM, position.northM - checkpoint.at.northM) <=
    checkpoint.radiusM
  )
}
