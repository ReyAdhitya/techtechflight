import {
  CRITERION_WORDS,
  FAILURE_WORDS,
  type FailureCondition,
  type SuccessCriterion,
} from './mission.ts'

/**
 * Scoring a finished Mission against the ten lifecycle claims (ADR-0018).
 *
 * Five success criteria and five failure conditions — the customer's Photo 5 list, not
 * anything invented here. Each criterion is met, not met, or unknown, and unknown is a
 * real answer: a Mission flown with no route coverage genuinely cannot say whether the
 * path was safe.
 *
 * A Scenario's `judges` list decides which criteria count. Pretending every Scenario
 * cares about all five would score Delivery on a safe route between checkpoints it never
 * drew, which is a grade on work the brief never asked for.
 */

/** What was observed while the Mission ran — explicit booleans, never inferred. */
export interface MissionScoreEvidence {
  /** Required checkpoints or targets completed. */
  readonly tasksCompleted?: boolean | null
  /** Whether enough was measured to judge the route at all. */
  readonly routeCoverageKnown?: boolean | null
  /** Whether the flown route stayed safe, when coverage was known. */
  readonly routeSafe?: boolean | null
  /** A collision or incident occurred. */
  readonly hadCollision?: boolean | null
  /** No-fly breaches — a count or a yes/no. */
  readonly noFlyViolations?: number | boolean | null
  /** Correct procedures followed. */
  readonly proceduresFollowed?: boolean | null
  readonly timeout?: boolean | null
  readonly crash?: boolean | null
  readonly batteryExhausted?: boolean | null
  readonly linkLost?: boolean | null
  readonly missedTarget?: boolean | null
}

export interface MissionScoreInput {
  /** Which success criteria this Scenario actually judges. */
  readonly judges: readonly SuccessCriterion[]
  readonly evidence: MissionScoreEvidence
}

export interface MissionScoreResult {
  readonly criteria: Readonly<Record<SuccessCriterion, boolean | null>>
  readonly failures: readonly FailureCondition[]
  /** 0..1, or null when too little was measured among the judged criteria. */
  readonly score: number | null
}

const ALL_CRITERIA_NULL: Readonly<Record<SuccessCriterion, boolean | null>> = {
  'tasks-completed': null,
  'safe-route': null,
  'no-collisions': null,
  'no-no-fly-violations': null,
  'procedures-followed': null,
}

function criterionMet(
  criterion: SuccessCriterion,
  evidence: MissionScoreEvidence,
): boolean | null {
  switch (criterion) {
    case 'tasks-completed':
      return booleanEvidence(evidence.tasksCompleted)
    case 'safe-route':
      /*
       * Safe route needs two facts: that something was measured, and what it said.
       * Coverage unknown means the board never had an opinion — not a failing grade.
       */
      if (evidence.routeCoverageKnown !== true) return null
      return booleanEvidence(evidence.routeSafe)
    case 'no-collisions':
      if (evidence.hadCollision === true) return false
      if (evidence.hadCollision === false) return true
      return null
    case 'no-no-fly-violations':
      return noFlyMet(evidence.noFlyViolations)
    case 'procedures-followed':
      return booleanEvidence(evidence.proceduresFollowed)
  }
}

function booleanEvidence(value: boolean | null | undefined): boolean | null {
  if (value === true) return true
  if (value === false) return false
  return null
}

function noFlyMet(value: number | boolean | null | undefined): boolean | null {
  if (typeof value === 'number') {
    if (value === 0) return true
    if (value > 0) return false
    return null
  }
  if (value === true) return false
  if (value === false) return true
  return null
}

function failuresFrom(evidence: MissionScoreEvidence): FailureCondition[] {
  const fired: FailureCondition[] = []
  if (evidence.timeout === true) fired.push('mission-timeout')
  if (evidence.crash === true) fired.push('crash')
  if (evidence.batteryExhausted === true) fired.push('battery-exhausted')
  if (evidence.linkLost === true) fired.push('control-link-lost')
  if (evidence.missedTarget === true) fired.push('missed-required-target')
  return fired
}

/**
 * Score a Mission from observed evidence and the Scenario's judge list.
 */
export function scoreMission(input: MissionScoreInput): MissionScoreResult {
  const { judges, evidence } = input
  const judgeSet = new Set(judges)

  const criteria = { ...ALL_CRITERIA_NULL }
  for (const criterion of judges) {
    criteria[criterion] = criterionMet(criterion, evidence)
  }

  const failures = failuresFrom(evidence)
  const score = overallScore(criteria, judgeSet, failures)

  return { criteria, failures, score }
}

function overallScore(
  criteria: Readonly<Record<SuccessCriterion, boolean | null>>,
  judges: ReadonlySet<SuccessCriterion>,
  failures: readonly FailureCondition[],
): number | null {
  const known: boolean[] = []
  for (const criterion of judges) {
    const met = criteria[criterion]
    if (met !== null) known.push(met)
  }

  if (known.length === 0) return null

  const average = known.filter(Boolean).length / known.length
  if (failures.length > 0) return 0
  return average
}

/**
 * One line for Reports and the debrief field — null when there is nothing honest to say.
 */
export function debriefFor(result: MissionScoreResult): string | null {
  if (result.failures.length > 0) {
    return FAILURE_WORDS[result.failures[0]!]
  }

  const judged = Object.entries(result.criteria).filter(([, met]) => met !== null)
  if (judged.length === 0) return null

  const unmet = judged.filter(([, met]) => met === false)
  if (unmet.length === 0) {
    return result.score === 1 ? 'All criteria met.' : null
  }

  return CRITERION_WORDS[unmet[0]![0] as SuccessCriterion] + ' not met.'
}
