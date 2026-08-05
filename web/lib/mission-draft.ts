import type { DroneId } from '@techtechflight/contract'
import { enclosesAnything, type Zone } from './airspace.ts'
import { emptyMission, type Mission, type MissionOutcome, type ScenarioId } from './mission.ts'

/**
 * The Mission a Teacher is building, kept where the rest of the side records are kept.
 *
 * A Mission used to live in React state inside the Lesson screen, which meant the Scenario
 * and the zones were lost the moment a Teacher walked to Control to grant a clearance. The
 * twelve-step flow crosses screens by design, so the Mission has to outlive one of them.
 *
 * Its own key, like attendance seals and the safety brief. Folding it into the Logbook
 * shape would need an ADR (see CLAUDE.md) and would put a Teacher's draft into the Vercel
 * sync, which nothing has asked for.
 */

export const MISSION_DRAFT_KEY = 'techtechflight:mission-draft'

export interface MissionDraft {
  /** The Lesson this Mission belongs to. A different Lesson starts a new draft. */
  readonly lessonId: string | null
  readonly mission: Mission | null
}

export function emptyMissionDraft(lessonId: string | null): MissionDraft {
  return { lessonId, mission: null }
}

function write(draft: MissionDraft): MissionDraft {
  if (typeof window === 'undefined') return draft
  try {
    window.localStorage.setItem(MISSION_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // A full or blocked store must not take the board down mid-lesson.
  }
  return draft
}

/** Load the Mission for this Lesson. A draft left by another Lesson does not carry over. */
export function readMissionDraft(lessonId: string | null): MissionDraft {
  if (typeof window === 'undefined') return emptyMissionDraft(lessonId)
  try {
    const raw = window.localStorage.getItem(MISSION_DRAFT_KEY)
    if (!raw) return emptyMissionDraft(lessonId)
    const parsed = JSON.parse(raw) as Partial<MissionDraft>
    if (parsed.lessonId !== lessonId) return emptyMissionDraft(lessonId)
    if (!parsed.mission || typeof parsed.mission !== 'object') {
      return emptyMissionDraft(lessonId)
    }
    return { lessonId, mission: parsed.mission }
  } catch {
    return emptyMissionDraft(lessonId)
  }
}

export function readMission(lessonId: string | null): Mission | null {
  return readMissionDraft(lessonId).mission
}

/**
 * Choose the Scenario, which is where a Mission starts existing.
 *
 * Changing the Scenario on a Mission that has not flown keeps the zones. A Teacher who
 * redraws the area after changing their mind has done the work twice for nothing.
 */
export function chooseScenario(lessonId: string | null, scenarioId: ScenarioId): Mission {
  const current = readMission(lessonId)
  const next: Mission =
    current === null
      ? emptyMission(`mission:${lessonId ?? 'no-lesson'}`, scenarioId, '')
      : { ...current, scenarioId }
  write({ lessonId, mission: next })
  return next
}

export function setMissionZones(
  lessonId: string | null,
  zones: readonly Zone[],
): Mission | null {
  const current = readMission(lessonId)
  if (current === null) return null
  const next: Mission = { ...current, zones }
  write({ lessonId, mission: next })
  return next
}

/** Which craft are flying this Mission. Written when teams take a Drone. */
export function setMissionDrones(
  lessonId: string | null,
  droneIds: readonly DroneId[],
): Mission | null {
  const current = readMission(lessonId)
  if (current === null) return null
  const next: Mission = { ...current, droneIds }
  write({ lessonId, mission: next })
  return next
}

/**
 * Mark the Mission as under way.
 *
 * Called when the first clearance is granted, because that is the moment a Teacher has
 * said the class may fly. Nothing here reaches an aircraft (ADR-0021).
 */
export function startMission(lessonId: string | null, now: number): Mission | null {
  const current = readMission(lessonId)
  if (current === null || current.startedAt !== null) return current
  const next: Mission = { ...current, startedAt: now }
  write({ lessonId, mission: next })
  return next
}

export function sealMission(lessonId: string | null, outcome: MissionOutcome): Mission | null {
  const current = readMission(lessonId)
  if (current === null) return null
  const next: Mission = { ...current, outcome }
  write({ lessonId, mission: next })
  return next
}

/** Replace the whole Mission. Used when a component hands back a sealed copy. */
export function putMission(lessonId: string | null, mission: Mission): Mission {
  write({ lessonId, mission })
  return mission
}

export function clearMissionDraft(lessonId: string | null): MissionDraft {
  return write(emptyMissionDraft(lessonId))
}

/**
 * Carry a Mission planned before the Lesson started onto the Lesson that just started.
 *
 * Set-up happens with no Lesson open, which is the point: a Teacher plans at 08:45 and
 * presses Start at 08:55. Without this the Scenario, the zones and the area drawn in that
 * ten minutes would be dropped by the Lesson they were drawn for.
 */
export function adoptMissionDraft(lessonId: string): MissionDraft {
  if (typeof window === 'undefined') return emptyMissionDraft(lessonId)
  try {
    const raw = window.localStorage.getItem(MISSION_DRAFT_KEY)
    if (!raw) return emptyMissionDraft(lessonId)
    const parsed = JSON.parse(raw) as Partial<MissionDraft>
    // Only a Mission drawn with no Lesson open is adopted. One belonging to an earlier
    // Lesson stays with that Lesson.
    if (parsed.lessonId != null) return readMissionDraft(lessonId)
    if (!parsed.mission || typeof parsed.mission !== 'object') {
      return emptyMissionDraft(lessonId)
    }
    return write({ lessonId, mission: { ...parsed.mission, id: `mission:${lessonId}` } })
  } catch {
    return emptyMissionDraft(lessonId)
  }
}

/** Whether the Mission Zone is drawn well enough to enclose anything. */
export function hasMissionZone(mission: Mission | null): boolean {
  if (mission === null) return false
  return mission.zones.some((zone) => zone.kind === 'mission' && enclosesAnything(zone))
}
