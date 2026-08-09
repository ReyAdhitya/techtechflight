import { describe, expect, it } from 'vitest'
import {
  MISSION_FLOW_STEPS,
  MISSION_STEP_COUNT,
  currentMissionStep,
  isMissionStepOpen,
  isSetUpStep,
  missionStepBlockedBy,
  missionStepHref,
  missionStepMark,
  missionStepsDone,
  noMissionYet,
  type MissionFlowFacts,
} from './mission-flow'

/**
 * The twelve steps, and the half the withdrawn rail was missing.
 *
 * The first rail could say which step was current and nothing else. What made it a second
 * navigation rather than a workflow is that a Teacher could click step 6 and arrive at a
 * screen that silently did nothing. These assertions are mostly about the locked state and
 * the words that go with it.
 */

const facts = (over: Partial<MissionFlowFacts> = {}): MissionFlowFacts => ({
  ...noMissionYet(),
  ...over,
})

/** Everything the set-up asks for, so a clearance in a case below is a reachable one. */
const pastTheBrief: Partial<MissionFlowFacts> = {
  scenarioChosen: true,
  missionZoneDrawn: true,
  teamOnCraft: true,
  preFlightPassed: true,
  briefed: true,
}

describe('the twelve-step Mission run', () => {
  it('has twelve steps, numbered in order, each somewhere to go', () => {
    expect(MISSION_FLOW_STEPS).toHaveLength(MISSION_STEP_COUNT)
    MISSION_FLOW_STEPS.forEach((step, index) => {
      expect(step.step).toBe(index + 1)
      expect(step.href.startsWith('/')).toBe(true)
      expect(step.label.length).toBeGreaterThan(0)
    })
  })

  /*
   * One page holds all twelve (ADR-0026). Lesson, Control and Reports were three
   * destinations for one run, and a Teacher mid-lesson had to know which of them answered
   * the question they had.
   */
  it('puts every step on the one Mission run page', () => {
    for (const step of MISSION_FLOW_STEPS) {
      expect(missionStepHref(step.step)).toBe(`/mission?step=${step.step}`)
    }
  })

  /*
   * The step number has to be in the link. Without it the page falls back to the step the
   * records imply, and Telemetry, Commands and Alerts were unreachable from the rail:
   * pressing any of them landed the Teacher back on the step they were already on.
   */
  it('names the step in the link rather than leaving the page to guess', () => {
    for (const step of [6, 7, 8, 9, 10, 11]) {
      expect(missionStepHref(step)).toContain(`step=${step}`)
    }
  })

  it('calls the first five steps set-up, because those are the ones Lesson shows', () => {
    expect([1, 2, 3, 4, 5].every(isSetUpStep)).toBe(true)
    expect(isSetUpStep(6)).toBe(false)
  })
})

describe('what is open', () => {
  it('opens nothing but the Scenario on a board where nothing has been decided', () => {
    const nothing = facts()
    expect(isMissionStepOpen(1, nothing)).toBe(true)
    for (const step of [2, 3, 4, 5, 6, 7, 11, 12]) {
      expect(isMissionStepOpen(step, nothing), `step ${step}`).toBe(false)
    }
  })

  /*
   * The wording is the prototype's, not a paraphrase of it, and it is checked exactly. A
   * generic "not available yet" is the version this whole rail exists to replace.
   */
  it('says what is standing in the way, in the words the prototype uses', () => {
    const nothing = facts()
    expect(missionStepBlockedBy(1, nothing)).toBeNull()
    expect(missionStepBlockedBy(2, nothing)).toBe('Choose a Scenario first')
    expect(missionStepBlockedBy(3, nothing)).toBe('Draw the Mission Zone first')
    expect(missionStepBlockedBy(4, nothing)).toBe('Put a team on a craft first')
    expect(missionStepBlockedBy(5, nothing)).toBe('Pre-flight one craft first')
    expect(missionStepBlockedBy(6, nothing)).toBe('Brief the class first')
    for (const step of [7, 8, 9, 10]) {
      expect(missionStepBlockedBy(step, nothing), `step ${step}`).toBe('Grant a takeoff first')
    }
    expect(missionStepBlockedBy(11, nothing)).toBe('Nothing has flown yet')
    expect(missionStepBlockedBy(12, nothing)).toBe('Seal the Mission first')
  })

  /* A lock reason sits on one line under the step name, beside a done string. */
  it('ends no lock reason in a full stop', () => {
    for (const step of MISSION_FLOW_STEPS) {
      const words = missionStepBlockedBy(step.step, facts())
      if (words !== null) expect(words.endsWith('.'), `step ${step.step}`).toBe(false)
    }
  })

  /*
   * The dead end. A Teacher reported the rail stuck on step 6 with the class already in
   * the air: 7 to 10 still said "grant a clearance first", and nothing on the board would
   * ever grant one, because no craft was on the Mission to enter the queue.
   *
   * A rail that refuses to leave the paperwork while Drones are flying is describing a
   * process rather than the room. Any of the three is enough to be under way.
   */
  it('opens the flying steps when the class is up, clearance on record or not', () => {
    const flyingWithoutPaperwork = facts({ ...pastTheBrief, airborne: true })
    for (const step of [7, 8, 9, 10]) {
      expect(isMissionStepOpen(step, flyingWithoutPaperwork), `step ${step}`).toBe(true)
      expect(missionStepMark(step, flyingWithoutPaperwork)).toBe('live')
    }

    const startedButNotYetUp = facts({ ...pastTheBrief, flown: true })
    expect(isMissionStepOpen(7, startedButNotYetUp)).toBe(true)
    expect(currentMissionStep(startedButNotYetUp)).toBe(11)
  })

  it('does not offer to seal a Mission that has never flown', () => {
    const nothingHasFlown = facts({ ...pastTheBrief })
    expect(isMissionStepOpen(11, nothingHasFlown)).toBe(false)
    expect(missionStepBlockedBy(11, nothingHasFlown)).toMatch(/Nothing has flown/i)
  })

  /*
   * The refusal is the step (ADR-0026), so step 11 stays open while a craft is up. Closing
   * it meant the surface never mounted: a Teacher with one Drone still flying got a line of
   * text and nothing to press, and the Recall that answered it was four steps back.
   */
  it('keeps Confirm mission complete open while a craft is still up, so it can refuse', () => {
    const flying = facts({ cleared: true, airborne: true })
    expect(isMissionStepOpen(11, flying)).toBe(true)
    expect(missionStepBlockedBy(11, flying)).toBeNull()

    const down = facts({ cleared: true, airborne: false })
    expect(isMissionStepOpen(11, down)).toBe(true)
    expect(missionStepBlockedBy(11, down)).toBeNull()
  })

  it('still refuses to open step 11 on a Mission that has never flown', () => {
    const nothing = facts({ ...pastTheBrief })
    expect(isMissionStepOpen(11, nothing)).toBe(false)
    expect(missionStepBlockedBy(11, nothing)).toBe('Nothing has flown yet')
  })
})

describe('how each step reads', () => {
  it('walks the set-up one step at a time as records arrive', () => {
    expect(currentMissionStep(facts())).toBe(1)
    expect(currentMissionStep(facts({ scenarioChosen: true }))).toBe(2)
    expect(
      currentMissionStep(facts({ scenarioChosen: true, missionZoneDrawn: true })),
    ).toBe(3)
    expect(
      currentMissionStep(
        facts({ scenarioChosen: true, missionZoneDrawn: true, teamOnCraft: true }),
      ),
    ).toBe(4)
  })

  it('reads flying steps as live rather than done, because they are not finished', () => {
    const flying = facts({ ...pastTheBrief, cleared: true, airborne: true })
    for (const step of [7, 8, 9, 10]) {
      expect(missionStepMark(step, flying), `step ${step}`).toBe('live')
    }
    expect(currentMissionStep(flying)).toBe(7)
  })

  it('settles the flying steps to done once the Mission is sealed', () => {
    const sealed = facts({ ...pastTheBrief, cleared: true, sealed: true })
    for (const step of [7, 8, 9, 10, 11]) {
      expect(missionStepMark(step, sealed), `step ${step}`).toBe('done')
    }
    expect(currentMissionStep(sealed)).toBe(12)
  })

  /*
   * A Teacher can untick the brief after granting a clearance. Step 6 is not open then,
   * and it is also unmistakably behind them, so it must not read as never started.
   */
  it('keeps a finished step done even when its condition stops holding', () => {
    const unticked = facts({ ...pastTheBrief, briefed: false, cleared: true })
    expect(missionStepMark(6, unticked)).toBe('done')
  })

  it('never shows two steps as current at once', () => {
    const cases: MissionFlowFacts[] = [
      facts(),
      facts({ scenarioChosen: true }),
      facts({ scenarioChosen: true, missionZoneDrawn: true, teamOnCraft: true }),
      facts({ ...pastTheBrief, cleared: true, airborne: true }),
      facts({ ...pastTheBrief, cleared: true, airborne: false }),
      facts({ ...pastTheBrief, cleared: true, sealed: true }),
      facts({ ...pastTheBrief, cleared: true, sealed: true, reviewed: true }),
    ]

    for (const state of cases) {
      const currents = MISSION_FLOW_STEPS.filter(
        (step) => missionStepMark(step.step, state) === 'current',
      )
      expect(currents.length, JSON.stringify(state)).toBeLessThanOrEqual(1)
    }
  })

  it('counts only finished steps as done, so live work never inflates the total', () => {
    expect(missionStepsDone(facts())).toBe(0)
    expect(missionStepsDone(facts({ scenarioChosen: true }))).toBe(1)
    // Cleared means steps 1 to 6 are behind them; 7 to 10 are live, not done.
    const flying = facts({
      scenarioChosen: true,
      missionZoneDrawn: true,
      teamOnCraft: true,
      preFlightPassed: true,
      briefed: true,
      cleared: true,
      airborne: true,
    })
    expect(missionStepsDone(flying)).toBe(6)
  })
})
