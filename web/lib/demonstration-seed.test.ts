import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearLogbook, readLogbook, runningLesson, saveRoll, startLesson } from './logbook.ts'
import {
  MISSION_BRIEFING_KEY,
  isMissionBriefingComplete,
  readMissionBriefing,
  tickAllMissionBriefRules,
} from '@/components/MissionBriefing'
import { breachesAt } from './airspace.ts'
import { scenarioOrUnknown } from './mission-scenarios.ts'
import { CLEARANCES_KEY, readClearances } from './clearance-store.ts'
import { MISSION_DRAFT_KEY, readMission } from './mission-draft.ts'
import { PRE_FLIGHT_SEVEN_KEY, readPreFlightSeven } from './preflight-seven.ts'
import { TEAMS_KEY, readTeams } from './teams.ts'
import { CLASSROOM_SESSION_KEY, readClassroomSession } from './classroom-session.ts'
import { isMissionStepOpen, missionStepBlockedBy, type MissionFlowFacts } from './mission-flow.ts'
import { missionFlowFactsFrom } from './mission-flow-facts.ts'
import { DEMONSTRATION_LABEL, rollHoldsRealChildren, seedDemonstration } from './demonstration-seed.ts'

/**
 * The demonstration seed.
 *
 * Two things are worth pinning above everything else. **Every step opens because its condition
 * genuinely holds** — no lock is removed, weakened or bypassed, because the locks are the
 * product guiding somebody and a rail that opened without the fact behind it would be teaching
 * a lie. And **it is impossible to seed into a real class**, because a demonstration writes
 * flights and attendance against names.
 */

const wipe = () => {
  clearLogbook()
  for (const key of [
    MISSION_DRAFT_KEY,
    CLEARANCES_KEY,
    TEAMS_KEY,
    PRE_FLIGHT_SEVEN_KEY,
    MISSION_BRIEFING_KEY,
    CLASSROOM_SESSION_KEY,
  ]) {
    window.localStorage.removeItem(key)
  }
}

beforeEach(wipe)
afterEach(wipe)

/**
 * The facts the rail reads, built the way the screen builds them.
 *
 * Telemetry is the pinned demonstration Fleet's resting state: on the ground, healthy, and
 * reporting. That is what a laptop with the simulator running actually hands the board, and
 * pre-flight reads six of its seven items straight off it.
 */
function facts(): MissionFlowFacts {
  const lesson = runningLesson(readLogbook())
  const mission = readMission(lesson?.id ?? null)
  return missionFlowFactsFrom({
    mission,
    teams: readTeams(),
    preFlight: readPreFlightSeven(lesson?.id ?? null),
    briefed: isMissionBriefingComplete(readMissionBriefing(lesson?.id ?? null)),
    clearances: readClearances(lesson?.id ?? null),
    telemetryFor: () => healthy,
    anyAirborne: false,
    reviewed: false,
  })
}

/** A craft on the bench with nothing wrong with it, which is what the simulator reports. */
const healthy = {
  batteryFraction: 0.9,
  batteryIsEstimate: false,
  airborne: false,
  fault: null,
  orientation: { rollDeg: 0, pitchDeg: 0, yawDeg: 0 },
  linkQuality: 0.95,
  proximity: null,
  camera: { streaming: false },
  extra: { altitudeHold: true },
} as never

describe('what the seed refuses', () => {
  /* A demonstration writing invented mornings into a real register is the failure here. */
  it('refuses a roll with a real child on it', () => {
    saveRoll(['Priya Raman'])

    const outcome = seedDemonstration({ now: 1_000, tickBrief: tickAllMissionBriefRules })

    expect(outcome.seeded).toBe(false)
    expect(outcome.refusedBecause).toContain('real children')
  })

  it('refuses while a Lesson is already under way', () => {
    startLesson('Year 8, period 3', 6, 6, 1_000, [])

    const outcome = seedDemonstration({ now: 2_000, tickBrief: tickAllMissionBriefRules })

    expect(outcome.seeded).toBe(false)
    expect(outcome.refusedBecause).toContain('already under way')
  })

  it('knows its own cast is not a real class', () => {
    expect(rollHoldsRealChildren(['Demo Amira', 'Demo Josh'])).toBe(false)
    expect(rollHoldsRealChildren(['Demo Amira', 'Priya'])).toBe(true)
    expect(rollHoldsRealChildren([])).toBe(false)
  })
})

describe('what the seed leaves behind', () => {
  it('runs on an empty laptop', () => {
    const outcome = seedDemonstration({ now: 1_000, tickBrief: tickAllMissionBriefRules })

    expect(outcome.seeded).toBe(true)
    expect(outcome.lessonId).not.toBeNull()
  })

  it('starts a Lesson that says it is a demonstration', () => {
    seedDemonstration({ now: 1_000, tickBrief: tickAllMissionBriefRules })

    expect(runningLesson(readLogbook())?.label).toBe(DEMONSTRATION_LABEL)
  })

  it('writes the same records a lesson writes, through the same functions', () => {
    seedDemonstration({ now: 1_000, tickBrief: tickAllMissionBriefRules })
    const lessonId = runningLesson(readLogbook())!.id

    const mission = readMission(lessonId)
    expect(mission?.scenarioId).toBe('search-rescue')
    expect(mission?.zones.length).toBeGreaterThan(0)
    expect(mission?.droneIds.length).toBeGreaterThan(0)
    expect(mission?.startedAt).not.toBeNull()
    expect(readClearances(lessonId).records.some((row) => row.grantedAt !== null)).toBe(true)
  })

  it('puts children in the classroom, each on a craft', () => {
    seedDemonstration({ now: 1_000, tickBrief: tickAllMissionBriefRules })

    const session = readClassroomSession()
    expect(session?.seats.length).toBe(3)
    expect(session?.seats.every((seat) => seat.droneId !== null)).toBe(true)
  })

  /**
   * A Mission with no points is a Mission nobody can finish.
   *
   * The seed shipped without them and a screenshot found it: `flyRoute` was handed an empty
   * route so nothing ever left the ground, and `allPointsReached` answered false forever so
   * Approve never appeared. Every step opened onto an empty demonstration.
   */
  it('gives the class somewhere to fly to', () => {
    seedDemonstration({ now: 1_000, tickBrief: tickAllMissionBriefRules })
    const lessonId = runningLesson(readLogbook())!.id

    expect(readMission(lessonId)?.checkpoints.length).toBeGreaterThan(0)
    expect((readClassroomSession()?.checkpoints ?? []).length).toBeGreaterThan(0)
  })

  /* No point may sit inside the zone the same seed drew, or the route breaches by design. */
  it('keeps every point out of its own No-fly Zone', () => {
    seedDemonstration({ now: 1_000, tickBrief: tickAllMissionBriefRules })
    const mission = readMission(runningLesson(readLogbook())!.id)!

    for (const point of mission.checkpoints) {
      expect(breachesAt(mission.zones, point.at)).toEqual([])
    }
  })

  /**
   * The tablet and the team brief must print the same length for one Mission.
   *
   * The seed typed 12 minutes into the classroom session while Search and Rescue's own default
   * is 8, so a child's screen and the paper in their hand disagreed until the board next
   * mounted and silently corrected one of them.
   */
  it('tells the tablets the same time limit the brief prints', () => {
    seedDemonstration({ now: 1_000, tickBrief: tickAllMissionBriefRules })
    const mission = readMission(runningLesson(readLogbook())!.id)!
    const scenario = scenarioOrUnknown(mission.scenarioId)

    expect(readClassroomSession()?.limitMinutes).toBe(
      mission.limitMinutes ?? scenario.defaultLimitMinutes,
    )
  })

  /* Step 8 is "Stay out of red", so a zone the board draws has to reach the tablets. */
  it('sends the No-fly Zone to the tablets as well as the Scope', () => {
    seedDemonstration({ now: 1_000, tickBrief: tickAllMissionBriefRules })
    const mission = readMission(runningLesson(readLogbook())!.id)!

    expect(readClassroomSession()?.zones.map((zone) => zone.id)).toEqual(
      mission.zones.map((zone) => zone.id),
    )
  })
})

/**
 * The point of the whole thing: every step opens, and opens honestly.
 *
 * `isMissionStepOpen` is the product's own function, unchanged. If a step here is shut, the
 * seed did not do enough — and the fix is to press one more thing a Teacher presses, never to
 * loosen the lock.
 */
describe('the rail after seeding', () => {
  it('opens every one of the twelve steps except the two a Teacher must still do', () => {
    seedDemonstration({ now: 1_000, tickBrief: tickAllMissionBriefRules })
    const after = facts()

    for (const step of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
      expect(
        isMissionStepOpen(step, after),
        `step ${step} is shut: ${missionStepBlockedBy(step, after)}`,
      ).toBe(true)
    }
  })

  /*
   * Step 12 stays shut, and that is correct rather than a gap. It opens on the Teacher sealing
   * the Mission, which is a decision somebody makes after watching a class fly. A seed that
   * opened it would be seeding a judgement.
   */
  it('leaves the seal to a Teacher', () => {
    seedDemonstration({ now: 1_000, tickBrief: tickAllMissionBriefRules })

    expect(isMissionStepOpen(12, facts())).toBe(false)
    expect(missionStepBlockedBy(12, facts())).toBe('Seal the Mission first')
  })

  /* And nothing is open before it runs, so the test above is measuring the seed. */
  it('leaves the rail shut when it refuses', () => {
    saveRoll(['Priya Raman'])
    seedDemonstration({ now: 1_000, tickBrief: tickAllMissionBriefRules })

    expect(isMissionStepOpen(7, facts())).toBe(false)
  })
})
