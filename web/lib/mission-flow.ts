/**
 * Where a Teacher is in the twelve-step Mission run, and what is not open to them yet.
 *
 * The twelve words are the customer's own operational workflow. A rail carrying them shipped
 * twice and was withdrawn twice, both times for being a second navigation beside a top bar
 * that already named seven places. ADR-0026 settles it the other way round: the rail is the
 * navigation on the Mission run page and the top bar is what collapses. Every step reports
 * one of four marks, and a step that is not open says in words what is standing in the way.
 *
 * The words here are the prototype's own, down to the lock reasons. Copy for the state line
 * a finished step carries is in `mission-flow-summary.ts`, because it needs counts this
 * module deliberately does not take.
 *
 * Derived from records the Teacher already made. Nothing here is a tour script or a counter
 * that a screen bumps on mount.
 */

export const MISSION_STEP_COUNT = 12 as const

export type MissionPhaseId = 'set-up' | 'in-the-air' | 'close-down'

export const MISSION_FLOW_PHASES: readonly {
  readonly id: MissionPhaseId
  readonly label: string
}[] = [
  { id: 'set-up', label: 'Set up' },
  { id: 'in-the-air', label: 'In the air' },
  { id: 'close-down', label: 'Close down' },
] as const

export interface MissionFlowStep {
  readonly step: number
  /** Short, for the rail. A noun, because the rail is a list of places in the day. */
  readonly label: string
  /** The heading on the step itself. An instruction, because a step is work. */
  readonly title: string
  /** One sentence on why the step exists, above the controls. */
  readonly why: string
  readonly phase: MissionPhaseId
  /**
   * Where the work lives. One page, and the step number in the query.
   *
   * All twelve are on `/mission` now (ADR-0026). The number has to be in the URL: without
   * it the page falls back to the step the records imply, so pressing Telemetry, or
   * Commands, or Alerts in the rail would put the Teacher back on whichever step the
   * records implied and there would be no way to reach the other three.
   */
  readonly href: string
  /** The primary button at the foot of the step, or null on the last one. */
  readonly next: string | null
}

export const MISSION_FLOW_STEPS: readonly MissionFlowStep[] = [
  {
    step: 1,
    label: 'Mission Scenario',
    title: 'Choose the Mission Scenario',
    why: 'What the class is trying to do today. The objective, what counts as success, and the risks all follow from this, so it comes first. It stays changeable until the first clearance.',
    phase: 'set-up',
    href: '/mission?step=1',
    next: 'Draw the Mission area',
  },
  {
    step: 2,
    label: 'Mission area',
    title: 'Draw the Mission area and the No-fly Zones',
    why: 'Metres from the Fleet’s own origin, not a map, so "inside this polygon" stays true even when the origin is wrong. Tap the grid to add a corner; three corners make a zone.',
    phase: 'set-up',
    href: '/mission?step=2',
    next: 'Put teams on craft',
  },
  {
    step: 3,
    label: 'Teams and Drones',
    title: 'Put each team on a Drone',
    why: 'Teams group the class for the Mission. Who is flying which craft still comes from the Logbook. This sits beside that, not instead of it.',
    phase: 'set-up',
    href: '/mission?step=3',
    next: 'Pre-flight each craft',
  },
  {
    step: 4,
    label: 'Pre-flight check',
    title: 'Pre-flight check, craft by craft',
    why: 'Six items read themselves from Telemetry. Propellers is the one a Teacher looks at and ticks, because the board cannot see a chipped blade.',
    phase: 'set-up',
    href: '/mission?step=4',
    next: 'The rules and the safety brief',
  },
  {
    step: 5,
    label: 'Rules and brief',
    title: 'Walk the class through the rules and the safety brief',
    why: 'Ticked as you say them, so the record shows the class was briefed and not just that a box existed.',
    phase: 'set-up',
    href: '/mission?step=5',
    next: 'Open the clearance queue',
  },
  {
    step: 6,
    label: 'Takeoff clearance',
    title: 'Approve takeoff',
    why: 'A team that is Ready, on a craft, and past pre-flight enters this queue by itself. You grant or hold. The Students fly the aircraft by hand, so this is a record, not a Command.',
    phase: 'in-the-air',
    href: '/mission?step=6',
    next: 'Watch the airspace',
  },
  {
    step: 7,
    label: 'Where everything is',
    title: 'Where everything is',
    why: 'Plan view in the Fleet’s own frame, with the zones you drew and the trail each craft has flown.',
    phase: 'in-the-air',
    href: '/mission?step=7',
    next: 'Read one craft closely',
  },
  {
    step: 8,
    label: 'Telemetry and camera',
    title: 'Telemetry and the camera',
    why: 'The numbers and the picture side by side, because a battery reading means something different when you can see what the craft is over.',
    phase: 'in-the-air',
    href: '/mission?step=8',
    next: 'The things you can send',
  },
  {
    step: 9,
    label: 'Commands',
    title: 'What you can send, and what you can only record',
    why: 'The Students fly by hand. Only five things actually reach the aircraft; the rest are instructions you note against the Mission so they still work on real hardware.',
    phase: 'in-the-air',
    href: '/mission?step=9',
    next: 'When something goes wrong',
  },
  {
    step: 10,
    label: 'Alerts',
    title: 'Alerts, worst one first',
    why: 'One focused Alert with the responses already worked out, and the rest of the queue folded away. The bar keeps its height at zero so nothing on the board jumps when an Alert arrives.',
    phase: 'in-the-air',
    href: '/mission?step=10',
    next: 'Bring the class down',
  },
  {
    step: 11,
    label: 'Mission complete',
    title: 'Confirm the Mission is complete',
    why: 'Seals the Mission and its score. It refuses while anything is still in the air. That refusal is the point of the step.',
    phase: 'close-down',
    href: '/mission?step=11',
    next: 'The debrief',
  },
  {
    step: 12,
    label: 'Logs and debrief',
    title: 'Logs, scores and the debrief',
    why: 'What happened, measured against the criteria the Scenario stated at step 1, and honest about what the board could not measure.',
    phase: 'close-down',
    href: '/mission?step=12',
    next: null,
  },
] as const

/**
 * What the board knows, said as plainly as the rail needs it.
 *
 * Every field is something the Teacher did or the Fleet reported. None of it is a step
 * number, so no screen can put the rail somewhere the records do not agree with.
 */
export interface MissionFlowFacts {
  readonly scenarioChosen: boolean
  readonly missionZoneDrawn: boolean
  /** At least one team has taken a craft. */
  readonly teamOnCraft: boolean
  /** At least one craft is past all seven pre-flight items. */
  readonly preFlightPassed: boolean
  readonly briefed: boolean
  /** At least one takeoff clearance has been granted for this Mission. */
  readonly cleared: boolean
  /**
   * The Mission is under way: it has a start time.
   *
   * Separate from `cleared` on purpose. A class can be in the air without a clearance on
   * record, and a rail that refuses to leave step 6 while Drones are flying is describing
   * paperwork rather than the room.
   */
  readonly flown: boolean
  /** Something is off the ground right now. */
  readonly airborne: boolean
  /** The Teacher has confirmed the Mission complete. */
  readonly sealed: boolean
  /** The Teacher is reading the debrief on Reports. */
  readonly reviewed: boolean
}

export function noMissionYet(): MissionFlowFacts {
  return {
    scenarioChosen: false,
    missionZoneDrawn: false,
    teamOnCraft: false,
    preFlightPassed: false,
    briefed: false,
    cleared: false,
    flown: false,
    airborne: false,
    sealed: false,
    reviewed: false,
  }
}

/**
 * How the rail paints one step.
 *
 * `live` is the one that is not in an ordinary stepper, and it is the point of the phase
 * split: monitoring, commanding and answering Alerts are not things a Teacher finishes.
 * They are true at the same time while the class is up, and they settle to `done` only when
 * the Mission is sealed.
 */
export type MissionStepMark = 'done' | 'current' | 'live' | 'locked'

const LIVE_STEPS = [7, 8, 9, 10] as const

function isLiveStep(step: number): boolean {
  return (LIVE_STEPS as readonly number[]).includes(step)
}

/**
 * Whether the class is flying this Mission.
 *
 * Any of three answers counts. A clearance on record is the tidy one; a Mission with a
 * start time is the honest one; something already off the ground settles it either way.
 * Requiring only the first is what let the rail sit at step 6 with Drones in the air.
 */
function isUnderWay(facts: MissionFlowFacts): boolean {
  return facts.cleared || facts.flown || facts.airborne
}

/**
 * Whether the Teacher can work on this step at all.
 *
 * Step 11 stays open while craft are airborne, and that is the opposite of what it used to
 * do. Closing it meant the surface never mounted, so a Teacher who pressed *Mission complete*
 * with one Drone still up got a single line of text and nothing to press: the way to bring
 * that Drone down was four steps away on a screen they had just left. ADR-0026 says the
 * refusal is the step. So the step opens, lists the Drones, offers Recall and Land against the
 * ones still up, and the Confirm button is the thing that refuses.
 */
export function isMissionStepOpen(step: number, facts: MissionFlowFacts): boolean {
  switch (step) {
    case 1:
      return true
    case 2:
      return facts.scenarioChosen
    case 3:
      return facts.missionZoneDrawn
    case 4:
      return facts.teamOnCraft
    case 5:
      return facts.preFlightPassed
    case 6:
      return facts.briefed
    case 7:
    case 8:
    case 9:
    case 10:
      return isUnderWay(facts)
    case 11:
      return isUnderWay(facts)
    case 12:
      return facts.sealed
    default:
      return false
  }
}

function isMissionStepDone(step: number, facts: MissionFlowFacts): boolean {
  switch (step) {
    case 1:
      return facts.scenarioChosen
    case 2:
      return facts.missionZoneDrawn
    case 3:
      return facts.teamOnCraft
    case 4:
      return facts.preFlightPassed
    case 5:
      return facts.briefed
    case 6:
      return facts.cleared
    case 7:
    case 8:
    case 9:
    case 10:
    case 11:
      return facts.sealed
    case 12:
      return facts.reviewed
    default:
      return false
  }
}

/**
 * What is standing in the way, in words, or null when the step is open.
 *
 * Said as the thing to go and do, not as the rule that was broken. The wording is the
 * prototype's, which is also why there is no full stop: these sit on one line under the
 * step name in the rail, beside a done string that is not a sentence either.
 *
 * Step 11 has one reason now rather than two. A craft still up no longer locks it: the step
 * opens and the Confirm button refuses, so the words for that live on the button's own line
 * where the Recall and Land that answer them are.
 */
export function missionStepBlockedBy(
  step: number,
  facts: MissionFlowFacts,
): string | null {
  if (isMissionStepOpen(step, facts)) return null

  switch (step) {
    case 2:
      return 'Choose a Scenario first'
    case 3:
      return 'Draw the Mission Zone first'
    case 4:
      return 'Put a team on a craft first'
    case 5:
      return 'Pre-flight one craft first'
    case 6:
      return 'Brief the class first'
    case 7:
    case 8:
    case 9:
    case 10:
      return 'Grant a takeoff first'
    case 11:
      return 'Nothing has flown yet'
    case 12:
      return 'Seal the Mission first'
    default:
      return 'Not yet'
  }
}

/**
 * The step a Teacher is on.
 *
 * Later work wins over earlier work, which is the same ladder the withdrawn Run bar used:
 * a sealed Mission is at the debrief however much of the set-up was skipped.
 */
export function currentMissionStep(facts: MissionFlowFacts): number {
  if (facts.reviewed || facts.sealed) return 12
  if (isUnderWay(facts) && !facts.airborne) return 11
  if (isUnderWay(facts)) return 7
  if (facts.briefed) return 6
  if (facts.preFlightPassed) return 5
  if (facts.teamOnCraft) return 4
  if (facts.missionZoneDrawn) return 3
  if (facts.scenarioChosen) return 2
  return 1
}

/** How one step reads, given the records and where the Teacher is. */
export function missionStepMark(step: number, facts: MissionFlowFacts): MissionStepMark {
  /*
   * Done is checked before open, and the order is the whole point. Step 6 closes again
   * once the brief is unticked and step 11 closes while a craft is up, so asking "is it
   * open" first would paint work the Teacher has already finished as not started.
   */
  if (isLiveStep(step) && isUnderWay(facts) && !facts.sealed) return 'live'
  if (isMissionStepDone(step, facts)) return 'done'
  if (!isMissionStepOpen(step, facts)) return 'locked'
  return step === currentMissionStep(facts) ? 'current' : 'locked'
}

/** How many of the twelve are behind the Teacher. Live steps do not count yet. */
export function missionStepsDone(facts: MissionFlowFacts): number {
  let done = 0
  for (const step of MISSION_FLOW_STEPS) {
    if (missionStepMark(step.step, facts) === 'done') done += 1
  }
  return done
}

/** Where the rail sends a Teacher for this step. */
export function missionStepHref(step: number): string {
  return MISSION_FLOW_STEPS[step - 1]?.href ?? '/lesson'
}

/** The set-up steps, which are the ones the Lesson screen shows one at a time. */
export function isSetUpStep(step: number): boolean {
  return step >= 1 && step <= 5
}
