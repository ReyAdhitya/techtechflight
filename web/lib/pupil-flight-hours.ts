import type { LessonRecord, Logbook, StudentRecord } from '@/lib/logbook'

/**
 * Accumulated airborne time per pupil across closed Lessons (#350 / F231).
 *
 * Closed Lessons keep who flew (`assignments`) and takeoff counts (`tally.flights`),
 * but not takeoff/land timestamps. This module:
 *
 * 1. Seals per-Lesson airborne milliseconds into localStorage when the Integrator
 *    (or a live sampler) knows the real intervals — preferred path.
 * 2. Falls back, only when a Lesson has no seal, to Lesson wall-clock for each
 *    assigned craft that recorded at least one takeoff. That overstates true
 *    airborne time and the UI says so — inventing telemetry we do not have would
 *    lie the other way.
 *
 * Local first. Never Telemetry. Never Postgres (ADR-0015).
 */

export const PUPIL_FLIGHT_HOURS_KEY = 'techtechflight:pupil-flight-hours'

export interface PupilFlightLessonSeal {
  readonly lessonId: string
  /** Milliseconds airborne, keyed by studentId (preferred) or display name. */
  readonly airborneMsByStudent: Readonly<Record<string, number>>
}

export interface PupilFlightHours {
  readonly studentKey: string
  readonly airborneMs: number
  readonly lessonCount: number
}

const listeners = new Set<() => void>()
let cache: readonly PupilFlightLessonSeal[] | null = null
let cacheIsFresh = false

function notify(): void {
  cacheIsFresh = false
  cache = null
  for (const listener of listeners) listener()
}

export function subscribePupilFlightHours(onChange: () => void): () => void {
  listeners.add(onChange)
  if (typeof window === 'undefined') return () => listeners.delete(onChange)
  const onStorage = (event: StorageEvent) => {
    if (event.key === PUPIL_FLIGHT_HOURS_KEY) notify()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onStorage)
  }
}

export function readPupilFlightSeals(): readonly PupilFlightLessonSeal[] {
  if (cacheIsFresh && cache !== null) return cache
  cache = load()
  cacheIsFresh = true
  return cache
}

export function readServerPupilFlightSeals(): readonly PupilFlightLessonSeal[] {
  return []
}

function load(): readonly PupilFlightLessonSeal[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(PUPIL_FLIGHT_HOURS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const seals: PupilFlightLessonSeal[] = []
    for (const entry of parsed) {
      if (entry === null || typeof entry !== 'object') continue
      const row = entry as Partial<PupilFlightLessonSeal>
      if (typeof row.lessonId !== 'string' || row.lessonId.trim() === '') continue
      if (row.airborneMsByStudent === null || typeof row.airborneMsByStudent !== 'object') {
        continue
      }
      const ms: Record<string, number> = {}
      for (const [key, value] of Object.entries(row.airborneMsByStudent)) {
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
          ms[key] = value
        }
      }
      seals.push({ lessonId: row.lessonId, airborneMsByStudent: ms })
    }
    return seals
  } catch {
    return []
  }
}

function persist(seals: readonly PupilFlightLessonSeal[]): void {
  cache = seals
  cacheIsFresh = true
  if (typeof window === 'undefined') {
    for (const listener of listeners) listener()
    return
  }
  try {
    window.localStorage.setItem(PUPIL_FLIGHT_HOURS_KEY, JSON.stringify(seals))
  } catch {
    /* memory only */
  }
  for (const listener of listeners) listener()
}

/** Idempotent seal for one closed Lesson — Integrator / sampler writes real ms. */
export function sealPupilFlightHours(seal: PupilFlightLessonSeal): void {
  const lessonId = seal.lessonId.trim()
  if (lessonId === '') return
  const next: PupilFlightLessonSeal = {
    lessonId,
    airborneMsByStudent: { ...seal.airborneMsByStudent },
  }
  const others = readPupilFlightSeals().filter((row) => row.lessonId !== lessonId)
  persist([next, ...others].slice(0, 200))
}

/**
 * Airborne ms from takeoff/land pairs — for when the Integrator still has events.
 *
 * Open takeoffs at `endedAt` are closed there so a Lesson that ends mid-air is not lost.
 */
export function airborneMsFromEvents(
  events: readonly { readonly droneId: string; readonly kind: string; readonly at: number }[],
  assignments: Readonly<Record<string, string>>,
  endedAt: number,
): Readonly<Record<string, number>> {
  const open = new Map<string, number>()
  const totals: Record<string, number> = {}
  const ordered = [...events].sort((a, b) => a.at - b.at)
  for (const event of ordered) {
    if (event.kind === 'took-off') {
      open.set(event.droneId, event.at)
      continue
    }
    if (event.kind !== 'landed') continue
    const started = open.get(event.droneId)
    if (started === undefined) continue
    open.delete(event.droneId)
    const student = assignments[event.droneId]
    if (student === undefined) continue
    totals[student] = (totals[student] ?? 0) + Math.max(0, event.at - started)
  }
  for (const [droneId, started] of open) {
    const student = assignments[droneId]
    if (student === undefined) continue
    totals[student] = (totals[student] ?? 0) + Math.max(0, endedAt - started)
  }
  return totals
}

function aliasesFor(studentKey: string, roster: readonly StudentRecord[]): ReadonlySet<string> {
  const aliases = new Set<string>([studentKey])
  const record = roster.find(
    (student) => student.studentId === studentKey || student.name === studentKey,
  )
  if (record) {
    aliases.add(record.studentId)
    aliases.add(record.name)
  }
  return aliases
}

/**
 * Wall-clock fallback for a closed Lesson with flights but no seal.
 *
 * Only crafts with `tally.flights > 0` contribute; grounded assignments stay at 0.
 */
export function fallbackAirborneMsFromLesson(
  lesson: LessonRecord,
  roster: readonly StudentRecord[] = [],
): Readonly<Record<string, number>> {
  if (lesson.endedAt === null) return {}
  if (!lesson.assignments) return {}
  const duration = Math.max(0, lesson.endedAt - lesson.startedAt)
  if (duration === 0) return {}
  const totals: Record<string, number> = {}
  for (const [droneId, assignmentValue] of Object.entries(lesson.assignments)) {
    const flights = lesson.tally?.[droneId]?.flights ?? 0
    if (flights <= 0) continue
    const record = roster.find(
      (student) =>
        student.studentId === assignmentValue || student.name === assignmentValue,
    )
    const key = record?.studentId ?? assignmentValue
    totals[key] = (totals[key] ?? 0) + duration
  }
  return totals
}

function msForAliases(
  msMap: Readonly<Record<string, number>>,
  aliases: ReadonlySet<string>,
): number {
  let best = 0
  for (const key of aliases) {
    const value = msMap[key] ?? 0
    if (value > best) best = value
  }
  return best
}

/** Sum airborne ms for one pupil across closed Lessons (seals first, else fallback). */
export function pupilAirborneMs(
  book: Logbook,
  studentKey: string,
  seals: readonly PupilFlightLessonSeal[] = readPupilFlightSeals(),
): PupilFlightHours {
  let airborneMs = 0
  let lessonCount = 0
  const aliases = aliasesFor(studentKey, book.roster)
  const sealByLesson = new Map(seals.map((seal) => [seal.lessonId, seal]))

  for (const lesson of book.lessons) {
    if (lesson.endedAt === null) continue
    const sealed = sealByLesson.get(lesson.id)
    const msMap = sealed?.airborneMsByStudent ?? fallbackAirborneMsFromLesson(lesson, book.roster)
    const added = msForAliases(msMap, aliases)
    if (added > 0) {
      airborneMs += added
      lessonCount += 1
    }
  }

  return { studentKey, airborneMs, lessonCount }
}

export function formatAirborneDuration(ms: number): string {
  if (ms <= 0) return '0 min'
  const totalMinutes = Math.floor(ms / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} h`
  return `${hours} h ${minutes} min`
}

export function clearPupilFlightHours(): void {
  cache = []
  cacheIsFresh = true
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(PUPIL_FLIGHT_HOURS_KEY)
    } catch {
      /* ignore */
    }
  }
  for (const listener of listeners) listener()
}
