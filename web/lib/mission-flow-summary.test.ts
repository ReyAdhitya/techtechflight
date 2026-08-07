import { describe, expect, it } from 'vitest'
import { MISSION_FLOW_STEPS } from './mission-flow'
import {
  missionStepDone,
  noMissionSummaryYet,
  type MissionFlowSummary,
} from './mission-flow-summary'

/**
 * What a finished step says it decided.
 *
 * The strings are the prototype's, and they are checked exactly rather than by pattern.
 * "Done" against step 1 is what sent a Teacher back into the step to find out which
 * Scenario they had picked, which is the whole reason this module exists.
 */

const summary = (over: Partial<MissionFlowSummary> = {}): MissionFlowSummary => ({
  ...noMissionSummaryYet(),
  ...over,
})

describe('what a step says it decided', () => {
  it('names the Scenario rather than saying a Scenario was chosen', () => {
    expect(missionStepDone(1, summary({ scenarioName: 'Search and Rescue' })))
      .toBe('Search and Rescue')
  })

  it('says a count of none in words on the set-up steps too', () => {
    expect(missionStepDone(5, summary({ briefSections: 5 }))).toBe('0 of 5 ticked')
  })

  it('counts the airspace as zones and no-fly zones', () => {
    expect(missionStepDone(2, summary({ missionZones: 1, noFlyZones: 2 })))
      .toBe('1 zone, 2 no-fly')
    expect(missionStepDone(2, summary({ missionZones: 2, noFlyZones: 0 })))
      .toBe('2 zones, 0 no-fly')
  })

  it('counts teams and the craft they took', () => {
    expect(missionStepDone(3, summary({ teams: 4, craft: 3 }))).toBe('4 teams, 3 craft')
    expect(missionStepDone(3, summary({ teams: 1, craft: 1 }))).toBe('1 team, 1 craft')
  })

  it('says how many craft are past pre-flight, out of how many are flying', () => {
    expect(missionStepDone(4, summary({ craft: 3, craftPastPreFlight: 2 })))
      .toBe('2 of 3 past it')
  })

  /*
   * A step a Teacher has not reached yet reads on the rail too, and a row of noughts is a
   * measurement of a class that has none rather than a gap. It has to be readable as a gap.
   */
  it('says an untouched set-up step is untouched, not a row of noughts', () => {
    const nothing = summary()
    expect(missionStepDone(1, nothing)).toBe('Not chosen yet')
    expect(missionStepDone(2, nothing)).toBe('Nothing drawn yet')
    expect(missionStepDone(3, nothing)).toBe('No teams yet')
    expect(missionStepDone(4, nothing)).toBe('No craft on a team yet')
  })

  it('says how much of the brief has been said out loud', () => {
    expect(missionStepDone(5, summary({ briefSections: 5, briefSectionsTicked: 3 })))
      .toBe('3 of 5 ticked')
  })

  /*
   * Zero is words, which is the prototype's own convention: step 9 reads "Nothing sent
   * yet" rather than "0 sent". A nought in a rail reads as a reading rather than as an
   * absence, and a Teacher glancing at it has to decide which it was.
   */
  it('says a count of none in words', () => {
    const nothing = summary()
    expect(missionStepDone(6, nothing)).toBe('Nobody waiting')
    expect(missionStepDone(7, nothing)).toBe('Nothing airborne')
    expect(missionStepDone(8, nothing)).toBe('No craft selected')
    expect(missionStepDone(9, nothing)).toBe('Nothing sent yet')
    expect(missionStepDone(10, nothing)).toBe('Nothing critical')
  })

  it('counts the queue, the airspace, the Commands and the Alerts when there are some', () => {
    expect(missionStepDone(6, summary({ awaitingClearance: 2 }))).toBe('2 waiting')
    expect(missionStepDone(7, summary({ airborne: 3 }))).toBe('3 airborne')
    expect(missionStepDone(8, summary({ selectedCraftName: 'Kestrel' })))
      .toBe('Kestrel selected')
    expect(missionStepDone(9, summary({ commandsSent: 2 }))).toBe('2 sent')
    expect(missionStepDone(10, summary({ criticalAlerts: 1 }))).toBe('1 critical')
  })

  /*
   * Step 11 answers "can I seal yet", so while something is up it names the aircraft as the
   * obstacle. Once everything is down it says so, rather than going quiet.
   */
  it('says what is still up against the step that seals the Mission', () => {
    expect(missionStepDone(11, summary({ airborne: 1 }))).toBe('1 still airborne')
    expect(missionStepDone(11, summary({ airborne: 0 }))).toBe('Every craft down')
  })

  it('stamps the seal with the time it happened', () => {
    const sealedAt = new Date(2026, 7, 7, 9, 44).getTime()
    expect(missionStepDone(12, summary({ sealedAt }))).toMatch(/^Sealed \d{1,2}[:.]\d{2}/)
    expect(missionStepDone(12, summary())).toBe('Not sealed yet')
  })

  it('has words for every one of the twelve, and no dash-like separators in any of them', () => {
    const full = summary({
      scenarioName: 'Delivery',
      missionZones: 1,
      noFlyZones: 1,
      teams: 2,
      craft: 2,
      craftPastPreFlight: 2,
      briefSections: 5,
      briefSectionsTicked: 5,
      awaitingClearance: 1,
      airborne: 1,
      selectedCraftName: 'Merlin',
      commandsSent: 1,
      criticalAlerts: 1,
      sealedAt: Date.now(),
    })

    for (const step of MISSION_FLOW_STEPS) {
      const words = missionStepDone(step.step, full)
      expect(words.length, `step ${step.step}`).toBeGreaterThan(0)
      expect(words, `step ${step.step}`).not.toMatch(/[—–·]/)
    }
  })
})
