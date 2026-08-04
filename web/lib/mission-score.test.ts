import { describe, expect, it } from 'vitest'
import { scenarioById } from './mission-scenarios.ts'
import { debriefFor, scoreMission, type MissionScoreEvidence } from './mission-score.ts'
import type { FailureCondition } from './mission.ts'

/**
 * What these pin is the customer's ten lifecycle claims — five met/not/unknown criteria
 * and five failure conditions — scored only from explicit evidence and only on what the
 * Scenario's `judges` list says it cares about.
 */

const perfectEvidence = (): MissionScoreEvidence => ({
  tasksCompleted: true,
  routeCoverageKnown: true,
  routeSafe: true,
  hadCollision: false,
  noFlyViolations: 0,
  proceduresFollowed: true,
})

describe('a perfect run', () => {
  it('meets every criterion the Scenario judges and scores one', () => {
    const scenario = scenarioById('search-rescue')!
    const result = scoreMission({ judges: scenario.judges, evidence: perfectEvidence() })

    for (const criterion of scenario.judges) {
      expect(result.criteria[criterion]).toBe(true)
    }
    expect(result.failures).toEqual([])
    expect(result.score).toBe(1)
    expect(debriefFor(result)).toBe('All criteria met.')
  })
})

describe('when something goes wrong', () => {
  it('zeros the score when a failure condition fired', () => {
    const scenario = scenarioById('delivery')!
    const result = scoreMission({
      judges: scenario.judges,
      evidence: { ...perfectEvidence(), timeout: true },
    })

    expect(result.failures).toContain('mission-timeout')
    expect(result.score).toBe(0)
    expect(debriefFor(result)).toBe('Ran out of time')
  })

  it('lowers the score when a judged criterion was not met but nothing failed', () => {
    const scenario = scenarioById('building-inspection')!
    const result = scoreMission({
      judges: scenario.judges,
      evidence: {
        tasksCompleted: true,
        hadCollision: false,
        noFlyViolations: 0,
        proceduresFollowed: false,
      },
    })

    expect(result.criteria['procedures-followed']).toBe(false)
    expect(result.failures).toEqual([])
    expect(result.score).toBe(0.75)
  })
})

describe('unknown when evidence is missing', () => {
  it('returns null criteria and a null score when nothing was measured', () => {
    const scenario = scenarioById('search-rescue')!
    const result = scoreMission({ judges: scenario.judges, evidence: {} })

    for (const criterion of scenario.judges) {
      expect(result.criteria[criterion]).toBeNull()
    }
    expect(result.score).toBeNull()
    expect(debriefFor(result)).toBeNull()
  })

  it('leaves safe-route unknown when route coverage was never measured', () => {
    const result = scoreMission({
      judges: ['safe-route'],
      evidence: { routeSafe: true },
    })

    expect(result.criteria['safe-route']).toBeNull()
    expect(result.score).toBeNull()
  })
})

describe('only what the Scenario judges', () => {
  it('leaves unjudged criteria null and out of the average', () => {
    /*
     * Delivery does not judge collisions. A collision in evidence must not drag the score
     * down through a criterion the brief never named.
     */
    const scenario = scenarioById('delivery')!
    const result = scoreMission({
      judges: scenario.judges,
      evidence: {
        tasksCompleted: true,
        routeCoverageKnown: true,
        routeSafe: true,
        hadCollision: true,
        noFlyViolations: 0,
        proceduresFollowed: true,
      },
    })

    expect(result.criteria['no-collisions']).toBeNull()
    expect(result.score).toBe(1)
  })
})

describe('the five failure conditions', () => {
  const cases: ReadonlyArray<[keyof MissionScoreEvidence, FailureCondition]> = [
    ['timeout', 'mission-timeout'],
    ['crash', 'crash'],
    ['batteryExhausted', 'battery-exhausted'],
    ['linkLost', 'control-link-lost'],
    ['missedTarget', 'missed-required-target'],
  ]

  it.each(cases)('recognises %s as %s', (key, failure) => {
    const result = scoreMission({
      judges: ['tasks-completed'],
      evidence: { tasksCompleted: true, [key]: true },
    })
    expect(result.failures).toEqual([failure])
  })
})
