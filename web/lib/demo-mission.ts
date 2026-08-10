import type { DroneId } from '@techtechflight/contract'
import type { Zone } from './airspace.ts'
import { emptyMission, type Mission, type MissionCheckpoint } from './mission.ts'

/**
 * The demonstration Mission: two minutes of real time, and one thing that goes wrong.
 *
 * ## Why it is two minutes and not eight
 *
 * Nobody watches a dot for eight minutes. The obvious fix is to speed the clock up, and this
 * product cannot: every reading on every screen is qualified by how old it is, and a minute
 * that lasted twenty seconds would make all of them lie at once. So the **Mission** is short
 * rather than the **clock** being fast. Two minutes of real time, a route a Drone can fly in
 * under one, and room for the incident and the way home in the rest.
 *
 * ## Why there is a scripted incident
 *
 * Without one, step 10 stays empty and the whole Emergency workflow is invisible: a
 * demonstration of a safety product in which nothing is ever unsafe. Random trouble is worse
 * than none, because it fires while the presenter is explaining something else. So it is one
 * incident, at a known moment, in the one place Recall belongs: a Drone drifts toward a
 * No-fly Zone, the Alert fires, the child's tablet turns red and says *move away*, and the
 * Teacher pulls it back.
 *
 * ## What this module does not do
 *
 * It does not take anything off the ground, it does not tick pre-flight, and it does not
 * brief the class. Those are the lesson, and a presenter walks them the way a Teacher does.
 * What it sets up is the airspace and the task: the Scenario, the zone, the points and the
 * clock. Steps 3 to 5 are still somebody's hands.
 */

export const DEMO_MISSION_KEY = 'techtechflight:demo-mission'

/** Two minutes of real time. The Mission is short; the clock is not fast. */
export const DEMO_MISSION_MINUTES = 2

/**
 * How long after the Mission starts the scripted drift begins.
 *
 * Mid-flight, and after the route is under way, so a presenter has had time to say what the
 * class is doing before the board interrupts them.
 */
export const DEMO_INCIDENT_AFTER_MS = 35_000

/**
 * The one No-fly Zone, over the bench at the far end of the room.
 *
 * In the Fleet's own local frame, metres east and north of where it was set up (ADR-0019).
 * Placed clear of every point on the route below, so the only way a Drone gets into it is the
 * scripted drift: a demonstration in which the aircraft breaches by accident on the way to a
 * checkpoint would be showing a badly drawn Mission rather than an incident.
 */
export const DEMO_ZONE: Zone = {
  id: 'demo-no-fly',
  kind: 'no-fly',
  name: 'Over the bench',
  points: [
    { eastM: 6.5, northM: 1 },
    { eastM: 8, northM: 1 },
    { eastM: 8, northM: 3 },
    { eastM: 6.5, northM: 3 },
  ],
}

/** Where the scripted drift takes the aircraft. Inside {@link DEMO_ZONE}, and only just. */
export const DEMO_INCIDENT_AT = { eastM: 7.2, northM: 2 }

/**
 * Three points, a triangle the far side of the room from the zone.
 *
 * Roughly twenty metres of flying at the speed everything else moves, which is well inside
 * two minutes and leaves the rest of the clock for the incident and the way home.
 */
export const DEMO_CHECKPOINTS: readonly MissionCheckpoint[] = [
  { id: 'demo-cp-1', name: 'Point 1', at: { eastM: 5, northM: 2 }, radiusM: 0.6, required: true },
  { id: 'demo-cp-2', name: 'Point 2', at: { eastM: 0, northM: -2 }, radiusM: 0.6, required: true },
  { id: 'demo-cp-3', name: 'Point 3', at: { eastM: 5, northM: -2 }, radiusM: 0.6, required: true },
]

/** The Mission the button writes. Everything decided except who is flying and the brief. */
export function demoMission(lessonId: string | null, droneIds: readonly DroneId[]): Mission {
  return {
    ...emptyMission(`mission:${lessonId ?? 'no-lesson'}`, 'search-rescue', 'Two minute demo'),
    limitMinutes: DEMO_MISSION_MINUTES,
    zones: [DEMO_ZONE],
    checkpoints: [...DEMO_CHECKPOINTS],
    droneIds: [...droneIds],
  }
}

export interface DemoMissionState {
  /** The demo is set up and its one incident has not happened yet. */
  readonly armed: boolean
  /** When the drift was started, so it fires once and not once a second. */
  readonly incidentFiredAt: number | null
}

const NOT_ARMED: DemoMissionState = { armed: false, incidentFiredAt: null }

export function readDemoMission(): DemoMissionState {
  if (typeof window === 'undefined') return NOT_ARMED
  try {
    const raw = window.localStorage.getItem(DEMO_MISSION_KEY)
    if (!raw) return NOT_ARMED
    const parsed = JSON.parse(raw) as Partial<DemoMissionState>
    return {
      armed: parsed.armed === true,
      incidentFiredAt: typeof parsed.incidentFiredAt === 'number' ? parsed.incidentFiredAt : null,
    }
  } catch {
    return NOT_ARMED
  }
}

function write(state: DemoMissionState): DemoMissionState {
  if (typeof window === 'undefined') return state
  try {
    window.localStorage.setItem(DEMO_MISSION_KEY, JSON.stringify(state))
  } catch {
    /* A full store must not take the board down mid-demonstration. */
  }
  return state
}

export function armDemoMission(): DemoMissionState {
  return write({ armed: true, incidentFiredAt: null })
}

export function markDemoIncidentFired(now: number): DemoMissionState {
  return write({ ...readDemoMission(), incidentFiredAt: now })
}

export function disarmDemoMission(): DemoMissionState {
  return write(NOT_ARMED)
}

/**
 * Whether the scripted drift should start now.
 *
 * Needs a Mission actually under way, not merely planned: the incident is mid-flight, and
 * firing it against a class still on the bench would move an aircraft nobody cleared.
 */
export function demoIncidentDue(
  state: DemoMissionState,
  startedAt: number | null,
  now: number,
): boolean {
  if (!state.armed || state.incidentFiredAt !== null) return false
  if (startedAt === null) return false
  return now - startedAt >= DEMO_INCIDENT_AFTER_MS
}
