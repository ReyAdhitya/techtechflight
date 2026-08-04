/**
 * Where a Teacher is in the twelve-step Mission run (Photo 3).
 *
 * Derived from Mission records — never from a tour script or local step counter.
 * The Integrator feeds flags from Lesson, Control and Reports; this module says
 * which step that is and the single next action.
 */

export const RUN_STEP_COUNT = 12 as const

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

interface StepDef {
  readonly label: string
  readonly nextAction: string
}

const STEPS: readonly StepDef[] = [
  {
    label: 'Select Scenario',
    nextAction: 'Pick a Mission Scenario for this Lesson.',
  },
  {
    label: 'Set Mission Area & No-fly',
    nextAction: 'Draw the Mission area and any no-fly zones.',
  },
  {
    label: 'Assign Teams',
    nextAction: 'Assign each team to a craft.',
  },
  {
    label: 'Pre-flight check',
    nextAction: 'Tick each craft’s pre-flight check when it is ready.',
  },
  {
    label: 'Mission Rules & Briefing',
    nextAction: 'Walk the class through the Mission rules and safety brief.',
  },
  {
    label: 'Approve Takeoff',
    nextAction: 'Grant clearance for each team ready to launch.',
  },
  {
    label: 'Monitor on Map',
    nextAction: 'Watch craft positions on the map.',
  },
  {
    label: 'Watch Telemetry & Camera',
    nextAction: 'Keep an eye on telemetry and the camera feed.',
  },
  {
    label: 'Issue Commands',
    nextAction: 'Use Land, Hover or Stop when a team needs help.',
  },
  {
    label: 'Handle Alerts',
    nextAction: 'Work through the alert at the top of the Attention bar.',
  },
  {
    label: 'Confirm Completion',
    nextAction: 'Confirm the Mission complete when every craft is down.',
  },
  {
    label: 'Review Logs/Scores/Debrief',
    nextAction: 'Review scores and debrief on Reports.',
  },
]

function reading(stepIndex: number, nextAction?: string): RunStepReading {
  const def = STEPS[stepIndex - 1]!
  return {
    step: stepIndex,
    totalSteps: RUN_STEP_COUNT,
    label: def.label,
    nextAction: nextAction ?? def.nextAction,
  }
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
  return STEPS[step - 1]?.label ?? ''
}
