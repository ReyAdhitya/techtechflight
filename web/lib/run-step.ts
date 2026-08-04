/**
 * Where a Teacher is in the twelve-step Mission run (Photo 3).
 *
 * Derived from Mission records — never from a tour script or local step counter.
 * The Integrator feeds flags from Lesson, Control and Reports; this module says
 * which step that is and the single next action. The Mission run rail uses the same
 * catalogue so the left nav and the Run bar never disagree about the twelve words.
 */

export const RUN_STEP_COUNT = 12 as const

export type RunStepPhase = 'prep' | 'live' | 'wrap'

export interface RunStepInput {
  readonly hasScenario: boolean
  readonly hasZones: boolean
  readonly hasTeams: boolean
  readonly preFlightDone: boolean
  readonly briefingDone: boolean
  /** At least one team is waiting on the Teacher for takeoff clearance. */
  readonly hasPendingClearance: boolean
  /** The Mission clock has started — at least one craft is in the air or the run is live. */
  readonly missionStarted: boolean
  /** Something on the Attention bar needs the Teacher now. */
  readonly hasAlerts: boolean
  /** Every craft in the Mission is on the ground. */
  readonly allDown: boolean
  /** The Teacher has confirmed this Mission complete. */
  readonly confirmedComplete: boolean
  /** The Teacher is on Reports reviewing logs, scores or debrief. */
  readonly onReports: boolean
  /** Optional — a Command would help right now (step 9). */
  readonly needsCommands?: boolean
  /** Optional — telemetry or camera needs watching (step 8). */
  readonly watchingTelemetry?: boolean
}

export interface RunStepReading {
  readonly step: number
  readonly totalSteps: typeof RUN_STEP_COUNT
  readonly label: string
  readonly nextAction: string
}

export interface RunStepDef {
  readonly step: number
  readonly label: string
  readonly nextAction: string
  readonly phase: RunStepPhase
  /**
   * Where that step’s work lives on the board. Prep stays on Lesson; live work on
   * Control; wrap-up on Reports. Hashes scroll to the block when the screen has one.
   */
  readonly href: string
}

export const RUN_STEP_PHASES: readonly {
  readonly id: RunStepPhase
  readonly label: string
}[] = [
  { id: 'prep', label: 'Preparation' },
  { id: 'live', label: 'Live operations' },
  { id: 'wrap', label: 'Wrap-up' },
] as const

export const RUN_STEPS: readonly RunStepDef[] = [
  {
    step: 1,
    label: 'Select Scenario',
    nextAction: 'Pick a Mission Scenario for this Lesson.',
    phase: 'prep',
    href: '/lesson#mission-scenario',
  },
  {
    step: 2,
    label: 'Set Mission Area & No-fly',
    nextAction: 'Draw the Mission area and any no-fly zones.',
    phase: 'prep',
    href: '/lesson#mission-area',
  },
  {
    step: 3,
    label: 'Assign Teams',
    nextAction: 'Assign each team to a craft.',
    phase: 'prep',
    href: '/lesson#mission-teams',
  },
  {
    step: 4,
    label: 'Pre-flight check',
    nextAction: 'Tick each craft’s pre-flight check when it is ready.',
    phase: 'prep',
    href: '/lesson#mission-preflight',
  },
  {
    step: 5,
    label: 'Mission Rules & Briefing',
    nextAction: 'Walk the class through the Mission rules and safety brief.',
    phase: 'prep',
    href: '/lesson#mission-briefing',
  },
  {
    step: 6,
    label: 'Approve Takeoff',
    nextAction: 'Grant clearance for each team ready to launch.',
    phase: 'prep',
    href: '/control#mission-clearance',
  },
  {
    step: 7,
    label: 'Monitor on Map',
    nextAction: 'Watch craft positions on the map.',
    phase: 'live',
    href: '/control#mission-map',
  },
  {
    step: 8,
    label: 'Watch Telemetry & Camera',
    nextAction: 'Keep an eye on telemetry and the camera feed.',
    phase: 'live',
    href: '/control#mission-telemetry',
  },
  {
    step: 9,
    label: 'Issue Commands',
    nextAction: 'Use Land, Hover or Stop when a team needs help.',
    phase: 'live',
    href: '/control#mission-commands',
  },
  {
    step: 10,
    label: 'Handle Alerts',
    nextAction: 'Work through the alert at the top of the Attention bar.',
    phase: 'live',
    href: '/control#mission-alerts',
  },
  {
    step: 11,
    label: 'Confirm Completion',
    nextAction: 'Confirm the Mission complete when every craft is down.',
    phase: 'wrap',
    href: '/control#mission-complete',
  },
  {
    step: 12,
    label: 'Review Logs/Scores/Debrief',
    nextAction: 'Review scores and debrief on Reports.',
    phase: 'wrap',
    href: '/reports#mission-review',
  },
] as const

function reading(stepIndex: number, nextAction?: string): RunStepReading {
  const def = RUN_STEPS[stepIndex - 1]!
  return {
    step: stepIndex,
    totalSteps: RUN_STEP_COUNT,
    label: def.label,
    nextAction: nextAction ?? def.nextAction,
  }
}

/** Where the rail should send a Teacher for this step number. */
export function runStepHref(step: number): string {
  return RUN_STEPS[step - 1]?.href ?? '/lesson'
}

export type RunStepMark = 'done' | 'current' | 'upcoming'

/** How the rail paints one step relative to the derived current step. */
export function runStepMark(step: number, current: number): RunStepMark {
  if (step < current) return 'done'
  if (step === current) return 'current'
  return 'upcoming'
}

/**
 * The current Mission step and the one thing the Teacher should do next.
 *
 * Later steps win when several could apply — alerts during flight outrank monitoring,
 * and landing outranks still watching the map.
 */
export function runStep(input: RunStepInput): RunStepReading {
  if (input.onReports || input.confirmedComplete) {
    return reading(12)
  }

  if (input.allDown && input.missionStarted && !input.confirmedComplete) {
    return reading(11)
  }

  if (input.missionStarted && !input.allDown) {
    if (input.hasAlerts) return reading(10)
    if (input.needsCommands) return reading(9)
    if (input.watchingTelemetry) return reading(8)
    return reading(7)
  }

  if (input.briefingDone && !input.missionStarted) {
    if (input.hasPendingClearance) return reading(6)
    return reading(6, 'Watch for teams to take off once cleared.')
  }

  if (input.preFlightDone && !input.briefingDone) return reading(5)
  if (input.hasTeams && !input.preFlightDone) return reading(4)
  if (input.hasZones && !input.hasTeams) return reading(3)
  if (input.hasScenario && !input.hasZones) return reading(2)

  return reading(1)
}

/** Words for one step — exported for tests and the Integrator. */
export function runStepLabel(step: number): string {
  return RUN_STEPS[step - 1]?.label ?? ''
}
