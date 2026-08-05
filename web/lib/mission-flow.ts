/**
 * Where a Teacher is in the twelve-step Mission run, and what is not open to them yet.
 *
 * The twelve words are the customer's own operational workflow. They were shipped once as
 * the Mission run rail and withdrawn the same day (DECISIONS, 2026-08-04) because that rail
 * was a second navigation: always mounted, no state of its own, saying nothing the top bar
 * did not. This module is the half that was missing. Every step reports one of four marks,
 * and a step that is not open says in words what is standing in the way, which is the thing
 * a Teacher could not find out before.
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
  readonly label: string
  readonly phase: MissionPhaseId
  /** Where the work lives. Set-up on Lesson, flying on Control, the debrief on Reports. */
  readonly href: string
  /** The one thing to do while this step is where the Teacher is. */
  readonly nextAction: string
}

export const MISSION_FLOW_STEPS: readonly MissionFlowStep[] = [
  {
    step: 1,
    label: 'Mission Scenario',
    phase: 'set-up',
    href: '/lesson?step=1',
    nextAction: 'Pick what the class is trying to achieve today.',
  },
  {
    step: 2,
    label: 'Mission area',
    phase: 'set-up',
    href: '/lesson?step=2',
    nextAction: 'Draw the Mission Zone and any No-fly Zones.',
  },
  {
    step: 3,
    label: 'Teams and Drones',
    phase: 'set-up',
    href: '/lesson?step=3',
    nextAction: 'Put each team on a craft.',
  },
  {
    step: 4,
    label: 'Pre-flight check',
    phase: 'set-up',
    href: '/lesson?step=4',
    nextAction: 'Work the seven items for each craft that is flying.',
  },
  {
    step: 5,
    label: 'Rules and brief',
    phase: 'set-up',
    href: '/lesson?step=5',
    nextAction: 'Walk the class through the Mission rules and the safety brief.',
  },
  {
    step: 6,
    label: 'Takeoff clearance',
    phase: 'in-the-air',
    href: '/control',
    nextAction: 'Grant or hold each team waiting to launch.',
  },
  {
    step: 7,
    label: 'Where everything is',
    phase: 'in-the-air',
    href: '/control',
    nextAction: 'Watch the Scope for craft leaving the Mission Zone.',
  },
  {
    step: 8,
    label: 'Telemetry and camera',
    phase: 'in-the-air',
    href: '/control',
    nextAction: 'Read a craft closely when its numbers look wrong.',
  },
  {
    step: 9,
    label: 'Commands',
    phase: 'in-the-air',
    href: '/control',
    nextAction: 'Land, Hover, Recall or Stop when a team needs help.',
  },
  {
    step: 10,
    label: 'Alerts',
    phase: 'in-the-air',
    href: '/control',
    nextAction: 'Work the Alert at the top of the Attention bar.',
  },
  {
    step: 11,
    label: 'Mission complete',
    phase: 'close-down',
    href: '/control',
    nextAction: 'Confirm the Mission once every craft is down.',
  },
  {
    step: 12,
    label: 'Logs and debrief',
    phase: 'close-down',
    href: '/reports',
    nextAction: 'Read the score against the criteria the Scenario stated.',
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
 * Whether the Teacher can work on this step at all.
 *
 * Step 11 closes again while anything is airborne. A Confirm button that is reachable and
 * refuses is worse than a step that says why it is not open yet.
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
      return facts.cleared
    case 11:
      return facts.cleared && !facts.airborne
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
 * Said as the thing to go and do, not as the rule that was broken.
 */
export function missionStepBlockedBy(
  step: number,
  facts: MissionFlowFacts,
): string | null {
  if (isMissionStepOpen(step, facts)) return null

  switch (step) {
    case 2:
      return 'Pick a Mission Scenario first.'
    case 3:
      return 'Draw the Mission Zone first.'
    case 4:
      return 'Put a team on a craft first.'
    case 5:
      return 'Pre-flight one craft first.'
    case 6:
      return 'Walk the class through the brief first.'
    case 7:
    case 8:
    case 9:
    case 10:
      return 'Grant a takeoff clearance first.'
    case 11:
      return facts.airborne
        ? 'Land or Recall every craft first.'
        : 'Grant a takeoff clearance first.'
    case 12:
      return 'Confirm the Mission complete first.'
    default:
      return 'Not yet.'
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
  if (facts.cleared && !facts.airborne) return 11
  if (facts.cleared) return 7
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
  if (isLiveStep(step) && facts.cleared && !facts.sealed) return 'live'
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
