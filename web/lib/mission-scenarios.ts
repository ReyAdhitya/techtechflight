import type { FailureCondition, MissionCheckpoint, ScenarioId, SuccessCriterion } from './mission.ts'

/**
 * The Mission Scenarios a class runs, as data.
 *
 * This is the customer's own scenario table, kept as close to their wording as the
 * board's register allows (ADR-0015). It is deliberately a catalogue rather than code:
 * a Teacher writes their own Scenarios too, and a built-in one must not be a different
 * kind of thing from a Teacher-written one, or the editor ends up unable to express half
 * of what ships.
 *
 * **A Lesson runs one Scenario at a time** — the customer states it, and it is worth
 * encoding rather than honouring by habit, because the alternative is a Teacher half-way
 * through Delivery reading Search and Rescue's success criteria.
 *
 * Follows the shape of `training-scenarios.ts` and `lesson-templates.ts`, which are both
 * already catalogue-as-data.
 */

export interface MissionScenario {
  readonly id: ScenarioId
  readonly name: string
  /** One sentence. What the class is trying to achieve. */
  readonly objective: string
  /** The shape of the run, in order. Shown in the Mission brief. */
  readonly flow: readonly string[]
  /** In the Teacher's words, not the identifiers. */
  readonly successCriteria: readonly string[]
  readonly commonRisks: readonly string[]
  /** What the Teacher watches on Control while this runs. */
  readonly teacherWatches: readonly string[]
  /** What the team is being assessed on doing. Printed on their brief. */
  readonly teamFocus: readonly string[]
  /** Minutes. A default the Teacher can change, never a rule. */
  readonly defaultLimitMinutes: number
  /**
   * The route a class flies, in the Fleet's own metres.
   *
   * A Teacher tapping a Scenario is the product. There is no points-drawing screen, so the
   * catalogue is the route until there is one. Empty here means `flyRoute` is handed nothing
   * and Approve never appears. Built-in Scenarios are never empty; an unknown Scenario is.
   *
   * Inside the Scope's window (`CLASSROOM_GEOFENCE`), not on the netting: a point the
   * picture cannot show is a point nobody can fly to.
   */
  readonly defaultCheckpoints: readonly MissionCheckpoint[]
  /**
   * Which of the five criteria this Scenario actually judges.
   *
   * Not every Scenario judges all five, and pretending otherwise would score a Mission on
   * something it never asked for. An Inspection with no checkpoints has no opinion about
   * a safe route between them.
   */
  readonly judges: readonly SuccessCriterion[]
  /** The failure conditions worth naming in this Scenario's brief. */
  readonly watchFor: readonly FailureCondition[]
  /** True where the camera can answer part of the objective (Search and Rescue). */
  readonly usesDetection: boolean
}

const REACH = 0.6

const point = (
  id: string,
  name: string,
  eastM: number,
  northM: number,
): MissionCheckpoint => ({
  id,
  name,
  at: { eastM, northM },
  radiusM: REACH,
  required: true,
})

const SEARCH_RESCUE: MissionScenario = {
  id: 'search-rescue',
  name: 'Search and Rescue',
  objective: 'Locate a target and reach or identify the correct area.',
  flow: [
    'Mission brief',
    'Takeoff',
    'Search route',
    'Identify target or zone',
    'Report',
    'Return home',
  ],
  successCriteria: [
    'Correct target area found',
    'Safe path flown',
    'Completed within the time limit',
  ],
  commonRisks: ['Target missed', 'Low charge', 'Obstacle', 'No-fly violation'],
  teacherWatches: ['Search progress', 'Route coverage', 'Alerts'],
  teamFocus: ['Navigation', 'Situational awareness', 'Safe flight'],
  defaultLimitMinutes: 8,
  defaultCheckpoints: [
    point('search-rescue-1', 'Point 1', -2, 1.5),
    point('search-rescue-2', 'Point 2', 2, 1.5),
    point('search-rescue-3', 'Point 3', 0, -1.5),
  ],
  judges: ['tasks-completed', 'safe-route', 'no-collisions', 'no-no-fly-violations'],
  watchFor: ['mission-timeout', 'missed-required-target', 'battery-exhausted'],
  // The one Scenario where the camera genuinely answers part of the objective.
  usesDetection: true,
}

const DELIVERY: MissionScenario = {
  id: 'delivery',
  name: 'Delivery',
  objective: 'Transport a payload to the correct destination.',
  flow: [
    'Mission brief',
    'Takeoff',
    'Follow route',
    'Reach delivery point',
    'Confirm delivery',
    'Return home',
  ],
  successCriteria: ['Correct destination', 'Stable flight', 'Delivered on time'],
  commonRisks: ['Wrong destination', 'Payload dropped', 'Low charge', 'Route error'],
  teacherWatches: ['Route', 'Timing', 'Payload status', 'Airspace safety'],
  teamFocus: ['Route accuracy', 'Delivery precision', 'Control'],
  defaultLimitMinutes: 6,
  defaultCheckpoints: [
    point('delivery-1', 'Point 1', -2.5, 0),
    point('delivery-2', 'Point 2', 2.5, 0),
  ],
  judges: ['tasks-completed', 'safe-route', 'no-no-fly-violations', 'procedures-followed'],
  watchFor: ['mission-timeout', 'missed-required-target', 'crash'],
  usesDetection: false,
}

const BUILDING_INSPECTION: MissionScenario = {
  id: 'building-inspection',
  name: 'Building Inspection',
  objective: 'Inspect a structure and collect visual information.',
  flow: [
    'Mission brief',
    'Takeoff',
    'Approach structure',
    'Inspect target points',
    'Capture camera views',
    'Return home',
  ],
  successCriteria: [
    'All target points checked',
    'Usable camera view at each',
    'Safe distance maintained',
  ],
  commonRisks: [
    'Collision',
    'Inspection point missed',
    'Poor camera angle',
    'Unsafe proximity',
  ],
  teacherWatches: ['Distance to the structure', 'Inspection completion', 'Alerts'],
  teamFocus: ['Stable hovering', 'Camera positioning', 'Obstacle awareness'],
  defaultLimitMinutes: 10,
  defaultCheckpoints: [
    point('building-inspection-1', 'Point 1', -2, 1.5),
    point('building-inspection-2', 'Point 2', 2, 1.5),
    point('building-inspection-3', 'Point 3', 0, -1),
  ],
  judges: ['tasks-completed', 'no-collisions', 'no-no-fly-violations', 'procedures-followed'],
  watchFor: ['crash', 'missed-required-target', 'mission-timeout'],
  usesDetection: false,
}

export const MISSION_SCENARIOS: readonly MissionScenario[] = [
  SEARCH_RESCUE,
  DELIVERY,
  BUILDING_INSPECTION,
]

export function scenarioById(id: ScenarioId): MissionScenario | null {
  return MISSION_SCENARIOS.find((scenario) => scenario.id === id) ?? null
}

/**
 * The Scenario a Mission is running, or a stand-in that says so.
 *
 * A Mission whose Scenario has been deleted — a Teacher tidying their own library after a
 * term — must still open, still print and still show its score. Returning null here would
 * push that decision onto every screen, and one of them would get it wrong.
 */
export function scenarioOrUnknown(id: ScenarioId): MissionScenario {
  return scenarioById(id) ?? UNKNOWN_SCENARIO
}

const UNKNOWN_SCENARIO: MissionScenario = {
  id: 'unknown',
  name: 'Scenario no longer on file',
  objective: 'This Mission was flown against a Scenario that has since been removed.',
  flow: [],
  successCriteria: [],
  commonRisks: [],
  teacherWatches: [],
  teamFocus: [],
  defaultLimitMinutes: 0,
  defaultCheckpoints: [],
  judges: [],
  watchFor: [],
  usesDetection: false,
}
