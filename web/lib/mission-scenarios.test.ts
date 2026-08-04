import { describe, expect, it } from 'vitest'
import { MISSION_SCENARIOS, scenarioById, scenarioOrUnknown } from './mission-scenarios.ts'
import { CRITERION_WORDS, FAILURE_WORDS, SUCCESS_CRITERIA } from './mission.ts'

/**
 * The catalogue is data a School was sold, so these check it says what the customer's own
 * scenario table says — and that every screen downstream can rely on all six fields being
 * present rather than testing for empties.
 */

describe('the shipped Scenarios', () => {
  it('is the three a class chooses between', () => {
    expect(MISSION_SCENARIOS.map((s) => s.id)).toEqual([
      'search-rescue',
      'delivery',
      'building-inspection',
    ])
  })

  it('gives every Scenario all six things a brief needs', () => {
    /*
     * A Scenario missing its risks or its team focus produces a brief with a blank
     * heading, which reads as a mistake rather than as an absence. Cheaper to require it
     * here than to write an empty state for every field on every surface.
     */
    for (const scenario of MISSION_SCENARIOS) {
      expect(scenario.objective, scenario.id).not.toHaveLength(0)
      expect(scenario.flow.length, scenario.id).toBeGreaterThan(2)
      expect(scenario.successCriteria.length, scenario.id).toBeGreaterThan(0)
      expect(scenario.commonRisks.length, scenario.id).toBeGreaterThan(0)
      expect(scenario.teacherWatches.length, scenario.id).toBeGreaterThan(0)
      expect(scenario.teamFocus.length, scenario.id).toBeGreaterThan(0)
    }
  })

  it('starts and ends every flow the same way', () => {
    // Every run briefs first and comes home last. A Scenario that skipped either would be
    // teaching something this product should not be used to teach.
    for (const scenario of MISSION_SCENARIOS) {
      expect(scenario.flow[0], scenario.id).toBe('Mission brief')
      expect(scenario.flow.at(-1), scenario.id).toBe('Return home')
    }
  })

  it('runs a clock on every Scenario', () => {
    for (const scenario of MISSION_SCENARIOS) {
      expect(scenario.defaultLimitMinutes, scenario.id).toBeGreaterThan(0)
    }
  })

  it('judges only criteria that exist', () => {
    for (const scenario of MISSION_SCENARIOS) {
      for (const criterion of scenario.judges) {
        expect(SUCCESS_CRITERIA, scenario.id).toContain(criterion)
      }
    }
  })

  it('judges something, but not necessarily everything', () => {
    /*
     * The load-bearing half of this is the second clause. An Inspection with no
     * checkpoints has no opinion about the route between them, and scoring it on one
     * would invent a judgement the Scenario never asked for.
     */
    for (const scenario of MISSION_SCENARIOS) {
      expect(scenario.judges.length, scenario.id).toBeGreaterThan(0)
    }
    const inspection = scenarioById('building-inspection')
    expect(inspection?.judges).not.toContain('safe-route')
  })

  it('uses the camera only where the camera can answer the objective', () => {
    // Search and Rescue is looking for something. The other two are not.
    expect(scenarioById('search-rescue')?.usesDetection).toBe(true)
    expect(scenarioById('delivery')?.usesDetection).toBe(false)
    expect(scenarioById('building-inspection')?.usesDetection).toBe(false)
  })
})

describe('a Scenario that is no longer on file', () => {
  it('is not found by id', () => {
    expect(scenarioById('something-a-teacher-deleted')).toBeNull()
  })

  it('still opens, and says what happened', () => {
    /*
     * A Teacher tidying their library after a term must not break last term's Reports.
     * Returning null here would push the decision onto every screen and one would get it
     * wrong.
     */
    const stand_in = scenarioOrUnknown('something-a-teacher-deleted')
    expect(stand_in.name).toMatch(/no longer on file/i)
    expect(stand_in.objective).not.toHaveLength(0)
    expect(stand_in.judges).toEqual([])
  })
})

describe('the words on screen', () => {
  it('names every criterion and every failure in a Teacher sentence', () => {
    // Identifiers are for code. A screen that showed `no-no-fly-violations` would be
    // showing its own plumbing.
    for (const criterion of SUCCESS_CRITERIA) {
      expect(CRITERION_WORDS[criterion]).toMatch(/^[A-Z]/)
      // Not the identifier wearing a capital. "No-fly" keeps its hyphen — that is the
      // glossary's spelling, not kebab case leaking through.
      expect(CRITERION_WORDS[criterion]).not.toBe(criterion)
      expect(CRITERION_WORDS[criterion]).toContain(' ')
    }
    for (const word of Object.values(FAILURE_WORDS)) {
      expect(word).toMatch(/^[A-Z]/)
    }
  })

  it('never claims certainty about a crash', () => {
    // Nothing on a real link reports one, so it is inferred and must read as inferred.
    expect(FAILURE_WORDS.crash).toMatch(/possible/i)
  })
})
