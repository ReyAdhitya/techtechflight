import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { readClassroomSession, resetClassroomForTests } from '@/lib/classroom-session'
import { clearLogbook, readLogbook, runningLesson, saveRoll, startLesson } from '@/lib/logbook'
import {
  MISSION_DRAFT_KEY,
  chooseScenario,
  putMission,
  readMission,
  setMissionZones,
  startMission,
} from '@/lib/mission-draft'
import type { Zone } from '@/lib/airspace'
import { ClassroomOpen } from './ClassroomOpen'

/**
 * The classroom has to open by itself.
 *
 * `openClassroom` was called from tests and from nowhere else, so a Student who opened the
 * board could only be told to wait for a Teacher who had no way to stop them waiting.
 */

const triangle: Zone = {
  id: 'zone-1',
  kind: 'no-fly',
  name: 'Over the desks',
  points: [
    { eastM: 0, northM: 0 },
    { eastM: 20, northM: 0 },
    { eastM: 20, northM: 20 },
  ],
}

const wipe = () => {
  window.localStorage.removeItem(MISSION_DRAFT_KEY)
  clearLogbook()
  resetClassroomForTests()
}

beforeEach(wipe)
afterEach(wipe)

describe('opening the classroom from the Mission', () => {
  it('opens nothing while there is no Mission to brief', () => {
    startLesson('Year 8', 6, 6, 1_000, [])

    render(<ClassroomOpen />)

    expect(readClassroomSession()).toBeNull()
  })

  it('copies the Scenario, the zones and the clock onto the session', () => {
    startLesson('Year 8, period 3', 6, 6, 1_000, [])
    const lessonId = runningLesson(readLogbook())!.id
    chooseScenario(lessonId, 'search-rescue')
    setMissionZones(lessonId, [triangle])

    render(<ClassroomOpen />)

    const session = readClassroomSession()!
    expect(session.lessonId).toBe(lessonId)
    expect(session.lessonLabel).toBe('Year 8, period 3')
    expect(session.scenarioName).toBe('Search and Rescue')
    expect(session.objective.length).toBeGreaterThan(0)
    expect(session.zones).toHaveLength(1)
    expect(session.limitMinutes).toBeGreaterThan(0)
  })

  /*
   * The rules a Student reads are the rules the class was briefed on, read from the
   * briefing. A second wording of the same rule is a second rule to a ten year old.
   */
  it('carries the briefing rules rather than a retyped copy of them', async () => {
    const { MISSION_BRIEFING_RULES } = await import('./MissionBriefing')
    startLesson('Year 8', 6, 6, 1_000, [])
    const lessonId = runningLesson(readLogbook())!.id
    chooseScenario(lessonId, 'delivery')

    render(<ClassroomOpen />)

    const session = readClassroomSession()!
    expect(session.rules).toEqual(MISSION_BRIEFING_RULES.map((rule) => rule.label))
  })

  /*
   * Before the Mission starts the brief is readable and nothing else moves. That is what a
   * Student sees while the Teacher is still setting up.
   */
  it('is not live until the Mission has started', () => {
    startLesson('Year 8', 6, 6, 1_000, [])
    const lessonId = runningLesson(readLogbook())!.id
    chooseScenario(lessonId, 'search-rescue')

    const { unmount } = render(<ClassroomOpen />)
    expect(readClassroomSession()?.live).toBe(false)
    unmount()

    startMission(lessonId, 2_000)
    render(<ClassroomOpen />)
    expect(readClassroomSession()?.live).toBe(true)
  })

  /*
   * The score reaches the tablets by the route the brief did. Confirming the Mission
   * complete writes the sealed Mission back to the side key, and this is what carries it
   * onto the document a Student's screen reads; without it a Teacher could seal a score no
   * child ever saw.
   */
  it('carries the sealed outcome once the Teacher confirms, and not before', () => {
    startLesson('Year 8', 6, 6, 1_000, [])
    const lessonId = runningLesson(readLogbook())!.id
    const mission = chooseScenario(lessonId, 'search-rescue')
    startMission(lessonId, 2_000)

    const { unmount } = render(<ClassroomOpen />)
    expect(readClassroomSession()?.outcome ?? null).toBeNull()
    unmount()

    putMission(lessonId, {
      ...readMission(lessonId)!,
      outcome: {
        endedAt: 9_000,
        criteria: {
          'tasks-completed': true,
          'safe-route': null,
          'no-collisions': true,
          'no-no-fly-violations': true,
          'procedures-followed': null,
        },
        failures: [],
        score: 1,
        debrief: 'All criteria met.',
      },
    })
    render(<ClassroomOpen />)

    expect(readClassroomSession()?.outcome?.score).toBe(1)
    expect(mission.scenarioId).toBe('search-rescue')
  })

  it('keeps one code across a re-open, so a joined Student stays joined', () => {
    startLesson('Year 8', 6, 6, 1_000, [])
    const lessonId = runningLesson(readLogbook())!.id
    chooseScenario(lessonId, 'search-rescue')

    const { unmount } = render(<ClassroomOpen />)
    const first = readClassroomSession()!.code
    unmount()

    setMissionZones(lessonId, [triangle])
    render(<ClassroomOpen />)

    expect(readClassroomSession()!.code).toBe(first)
  })

  it('copies the class roll onto the session for Student tablets', () => {
    saveRoll(['Priya', 'Sam'])
    startLesson('Year 8', 6, 6, 1_000, [])
    const lessonId = runningLesson(readLogbook())!.id
    chooseScenario(lessonId, 'search-rescue')

    render(<ClassroomOpen />)

    expect(readClassroomSession()?.roster?.map((row) => row.name)).toEqual(['Priya', 'Sam'])
  })

  /*
   * The Mission draft is its own key. Choosing a Scenario after ClassroomOpen has mounted
   * must still mint a code; listening only to the Logbook left the code panel empty forever.
   */
  it('opens the classroom when a Scenario is chosen after mount', () => {
    startLesson('Year 8', 6, 6, 1_000, [])
    const lessonId = runningLesson(readLogbook())!.id

    render(<ClassroomOpen />)
    expect(readClassroomSession()).toBeNull()

    act(() => {
      chooseScenario(lessonId, 'search-rescue')
    })

    expect(readClassroomSession()?.code).toHaveLength(4)
    expect(readClassroomSession()?.scenarioId).toBe('search-rescue')
  })
})
