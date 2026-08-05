import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  MISSION_DRAFT_KEY,
  adoptMissionDraft,
  chooseScenario,
  clearMissionDraft,
  hasMissionZone,
  readMission,
  setMissionDrones,
  setMissionZones,
  startMission,
} from './mission-draft'
import type { Zone } from './airspace'

/**
 * The Mission has to outlive the screen it was drawn on.
 *
 * It used to live in React state inside Lesson, so walking to Control to grant a takeoff
 * clearance threw away the Scenario and the zones. The twelve-step flow crosses screens on
 * purpose, which is what made this necessary.
 */

const triangle: Zone = {
  id: 'zone-1',
  kind: 'mission',
  name: 'Mission Zone',
  points: [
    { eastM: 0, northM: 0 },
    { eastM: 10, northM: 0 },
    { eastM: 10, northM: 10 },
  ],
}

beforeEach(() => {
  window.localStorage.removeItem(MISSION_DRAFT_KEY)
})

afterEach(() => {
  window.localStorage.removeItem(MISSION_DRAFT_KEY)
})

describe('the Mission a Teacher is drawing', () => {
  it('starts existing when a Scenario is chosen', () => {
    expect(readMission(null)).toBeNull()

    const mission = chooseScenario(null, 'search-rescue')
    expect(mission.scenarioId).toBe('search-rescue')
    expect(readMission(null)?.scenarioId).toBe('search-rescue')
  })

  it('keeps the zones when a Teacher changes their mind about the Scenario', () => {
    chooseScenario(null, 'search-rescue')
    setMissionZones(null, [triangle])

    const changed = chooseScenario(null, 'delivery')
    expect(changed.scenarioId).toBe('delivery')
    expect(changed.zones).toHaveLength(1)
  })

  it('will not write zones onto a Mission that does not exist yet', () => {
    expect(setMissionZones(null, [triangle])).toBeNull()
    expect(readMission(null)).toBeNull()
  })

  it('knows whether the Mission Zone encloses anything', () => {
    expect(hasMissionZone(null)).toBe(false)
    chooseScenario(null, 'search-rescue')
    expect(hasMissionZone(readMission(null))).toBe(false)

    setMissionZones(null, [triangle])
    expect(hasMissionZone(readMission(null))).toBe(true)
  })

  it('starts once and keeps the first start time', () => {
    chooseScenario(null, 'search-rescue')
    expect(startMission(null, 1_000)?.startedAt).toBe(1_000)
    expect(startMission(null, 5_000)?.startedAt).toBe(1_000)
  })

  it('records which craft are flying it', () => {
    chooseScenario(null, 'search-rescue')
    expect(setMissionDrones(null, ['ttf-0001', 'ttf-0002'])?.droneIds).toEqual([
      'ttf-0001',
      'ttf-0002',
    ])
  })
})

describe('carrying a Mission into the Lesson it was planned for', () => {
  /*
   * Set-up happens before Start. Without adoption, ten minutes of planning would be
   * dropped by the Lesson it was planned for, which is the worst possible moment.
   */
  it('adopts a Mission drawn before any Lesson was open', () => {
    chooseScenario(null, 'search-rescue')
    setMissionZones(null, [triangle])

    const adopted = adoptMissionDraft('lesson-1')
    expect(adopted.mission?.scenarioId).toBe('search-rescue')
    expect(adopted.mission?.zones).toHaveLength(1)
    expect(readMission('lesson-1')?.scenarioId).toBe('search-rescue')
  })

  it('leaves an earlier Lesson its own Mission rather than stealing it', () => {
    chooseScenario(null, 'search-rescue')
    adoptMissionDraft('lesson-1')

    expect(adoptMissionDraft('lesson-2').mission).toBeNull()
    expect(readMission('lesson-2')).toBeNull()
  })

  it('does not read one Lesson Mission on another Lesson', () => {
    chooseScenario('lesson-1', 'delivery')
    expect(readMission('lesson-2')).toBeNull()
  })

  it('clears away', () => {
    chooseScenario(null, 'search-rescue')
    clearMissionDraft(null)
    expect(readMission(null)).toBeNull()
  })
})
