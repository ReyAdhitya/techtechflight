import { groundStationHttpOrigin } from './classroom-setup'
import { readClassroomSession } from './classroom-session'
import { readLogbook, replaceLogbookFromCloud, runningLesson, type Logbook } from './logbook'
import { readMission } from './mission-draft'
import { scenarioOrUnknown } from './mission-scenarios'
import { readTeams } from './teams'

/**
 * What a Lesson leaves in the records file, built from the board's own records.
 *
 * The ground station writes this at Lesson boundaries (ADR-0035). The browser copy stays so
 * the board works with the ground station closed; **the file wins when they disagree**.
 *
 * No live readings. Coordinates only on zones and checkpoints, because those are what a
 * Teacher set.
 */

export interface BrowserLessonSnapshot {
  readonly schoolName: string
  readonly className: string
  readonly teacherName: string
  readonly lessonId: string
  readonly lessonLabel: string
  readonly startedAt: string
  readonly endedAt: string | null
  readonly demonstration: boolean
  readonly scenario: {
    readonly id: string
    readonly name: string
    readonly objective: string
    readonly limitMinutes: number
  } | null
  readonly missionId: string | null
  readonly missionStartedAt: string | null
  readonly missionSealedAt: string | null
  readonly drones: readonly { readonly id: string; readonly label: string }[]
  readonly teams: readonly {
    readonly id: string
    readonly name: string
    readonly studentIds: readonly string[]
    readonly droneId: string | null
  }[]
  readonly zones: readonly {
    readonly id: string
    readonly name: string
    readonly kind: string
    readonly points: readonly { readonly eastM: number; readonly northM: number }[]
  }[]
  readonly checkpoints: readonly {
    readonly id: string
    readonly eastM: number
    readonly northM: number
  }[]
  readonly seats: readonly {
    readonly studentId: string
    readonly studentName: string
    readonly droneId: string | null
    readonly droneLabel: string | null
    readonly present: boolean
    readonly tookOffAt: string | null
    readonly landedAt: string | null
    readonly reached: readonly { readonly checkpointId: string; readonly at: string }[]
  }[]
}

const iso = (at: number | null | undefined): string | null =>
  at === null || at === undefined ? null : new Date(at).toISOString()

/**
 * School, class and teacher have no screen of their own. Fewer words than inventing a form.
 */
const ANONYMOUS = {
  schoolName: 'School',
  className: 'Class',
  teacherName: 'Teacher',
} as const

export function lessonSnapshotFromBrowser(
  lessonId?: string,
  book: Logbook = readLogbook(),
): BrowserLessonSnapshot | null {
  const lesson =
    lessonId !== undefined
      ? (book.lessons.find((row) => row.id === lessonId) ?? null)
      : (runningLesson(book) ?? book.lessons[0] ?? null)
  if (lesson === null) return null

  const mission = readMission(lesson.id)
  const session = readClassroomSession()
  const teams = readTeams()
  const scenario = mission ? scenarioOrUnknown(mission.scenarioId) : null
  const absent = new Set(book.absentStudentIds ?? [])

  const drones =
    session?.drones?.map((drone) => ({ id: drone.droneId, label: drone.droneName })) ??
    (mission?.droneIds ?? Object.keys(lesson.assignments ?? {})).map((id, index) => ({
      id,
      label: `Drone ${index + 1}`,
    }))

  const seats =
    session?.seats.map((seat) => {
      const at = iso(seat.flownAt) ?? iso(lesson.startedAt) ?? new Date(0).toISOString()
      return {
        studentId: seat.studentId,
        studentName: seat.name,
        droneId: seat.droneId,
        droneLabel: seat.droneName,
        present: !absent.has(seat.studentId),
        tookOffAt: iso(seat.flownAt),
        landedAt: seat.phase === 'complete' ? iso(session.updatedAt) : null,
        reached: seat.reachedCheckpointIds.map((checkpointId) => ({
          checkpointId,
          at,
        })),
      }
    }) ?? []

  return {
    ...ANONYMOUS,
    className: lesson.label,
    lessonId: lesson.id,
    lessonLabel: lesson.label,
    startedAt: new Date(lesson.startedAt).toISOString(),
    endedAt: iso(lesson.endedAt),
    demonstration: lesson.label === 'Demonstration lesson',
    scenario:
      mission && scenario
        ? {
            id: scenario.id,
            name: scenario.name,
            objective: scenario.objective,
            limitMinutes: mission.limitMinutes ?? scenario.defaultLimitMinutes,
          }
        : null,
    missionId: mission?.id ?? null,
    missionStartedAt: iso(mission?.startedAt),
    missionSealedAt: iso(mission?.outcome?.endedAt),
    drones,
    teams: teams.map((team) => ({
      id: team.id,
      name: team.name,
      studentIds: team.studentIds,
      droneId: team.droneId,
    })),
    zones: (mission?.zones ?? []).map((zone) => ({
      id: zone.id,
      name: zone.name,
      kind: zone.kind,
      points: zone.points.map((point) => ({ eastM: point.eastM, northM: point.northM })),
    })),
    checkpoints: (mission?.checkpoints ?? []).map((checkpoint) => ({
      id: checkpoint.id,
      eastM: checkpoint.at.eastM,
      northM: checkpoint.at.northM,
    })),
    seats,
  }
}

/**
 * The suite must not write the developer's real records file.
 *
 * `startLesson` / `endLesson` persist as a side effect. If a ground station is listening on
 * this machine while `npm test` runs, those calls would PUT into
 * `Documents\TechTech Flight`. A test that hands its own `fetch` still talks, which is how
 * the persist tests work.
 */
function talksToGroundStation(fetchImpl: typeof fetch): boolean {
  return process.env['VITEST'] === undefined || fetchImpl !== fetch
}

/**
 * Push this Lesson into the file on the laptop. Fire-and-forget: the browser copy already
 * won, and a closed ground station must not stall a Teacher ending a class.
 */
export function persistLessonRecords(
  lessonId?: string,
  fetchImpl: typeof fetch = fetch,
): void {
  if (typeof window === 'undefined') return
  if (!talksToGroundStation(fetchImpl)) return
  const snapshot = lessonSnapshotFromBrowser(lessonId)
  if (snapshot === null) return
  const origin = groundStationHttpOrigin(window.location)
  const book = readLogbook()
  void fetchImpl(`${origin}/api/records`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(snapshot),
  }).catch(() => {
    /* Ground station closed. The browser copy remains. */
  })
  void fetchImpl(`${origin}/api/records/logbook`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ updatedAt: book.revisedAt ?? Date.now(), book }),
  }).catch(() => {
    /* Same. */
  })
}

/**
 * When the file and the browser disagree, the file wins (ADR-0035).
 *
 * Ties go to the file, the way the classroom merge ties go to the store. A **vacant**
 * browser (no class, no Lesson) loses even if it stamped `revisedAt` just now: clearing
 * browsing data then opening the board is exactly that, and it is the failure this exists
 * to survive. A cleared browser with no `revisedAt` also always loses.
 */
export async function hydrateRecordsFromFile(
  fetchImpl: typeof fetch = fetch,
): Promise<'file' | 'browser' | 'skipped'> {
  if (typeof window === 'undefined') return 'skipped'
  if (!talksToGroundStation(fetchImpl)) return 'skipped'
  const origin = groundStationHttpOrigin(window.location)
  try {
    const response = await fetchImpl(`${origin}/api/records/logbook`)
    if (!response.ok) return 'browser'
    const body = (await response.json()) as { updatedAt?: unknown; book?: unknown }
    if (typeof body.updatedAt !== 'number' || !body.book || typeof body.book !== 'object') {
      return 'browser'
    }
    const local = readLogbook()
    const vacant = local.lessons.length === 0 && local.roll.length === 0
    if (vacant || body.updatedAt >= (local.revisedAt ?? 0)) {
      replaceLogbookFromCloud(body.book as Logbook, body.updatedAt)
      return 'file'
    }
    return 'browser'
  } catch {
    return 'skipped'
  }
}
