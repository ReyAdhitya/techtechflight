import type { Logbook, StudentRecord } from '@/lib/logbook'

/**
 * Attendance over time — present / absent tallies per Student (#340 / F221).
 *
 * The Logbook already keeps who is marked absent for the open session
 * (`absentStudentIds`) and who flew each closed Lesson (`assignments`). This
 * module seals a snapshot per Lesson into localStorage so those marks survive
 * into a term view — local first, never Telemetry, never a school database
 * (ADR-0015 / ADR-0005).
 *
 * Sealing is idempotent per `lessonId`. The Integrator should call
 * `sealAttendanceFromBook` when a Lesson closes (or starts, if preferred);
 * until then, counts stay at zero rather than inventing history.
 */

export const ATTENDANCE_HISTORY_KEY = 'techtechflight:attendance-history'

/** One sealed Lesson — who was in the room and who was marked away. */
export interface AttendanceSession {
  readonly lessonId: string
  readonly at: number
  readonly presentStudentIds: readonly string[]
  readonly absentStudentIds: readonly string[]
}

export interface AttendanceCounts {
  readonly present: number
  readonly absent: number
}

export const EMPTY_ATTENDANCE_COUNTS: AttendanceCounts = { present: 0, absent: 0 }

const listeners = new Set<() => void>()
let cache: readonly AttendanceSession[] | null = null
let cacheIsFresh = false

function notify(): void {
  cacheIsFresh = false
  cache = null
  for (const listener of listeners) listener()
}

export function subscribeAttendanceHistory(onChange: () => void): () => void {
  listeners.add(onChange)
  if (typeof window === 'undefined') return () => listeners.delete(onChange)
  const onStorage = (event: StorageEvent) => {
    if (event.key === ATTENDANCE_HISTORY_KEY) notify()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onStorage)
  }
}

export function readAttendanceHistory(): readonly AttendanceSession[] {
  if (cacheIsFresh && cache !== null) return cache
  cache = load()
  cacheIsFresh = true
  return cache
}

/** Empty on the server — nothing to hydrate from. */
export function readServerAttendanceHistory(): readonly AttendanceSession[] {
  return []
}

function load(): readonly AttendanceSession[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(ATTENDANCE_HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const sessions: AttendanceSession[] = []
    for (const entry of parsed) {
      if (entry === null || typeof entry !== 'object') continue
      const row = entry as Partial<AttendanceSession>
      if (typeof row.lessonId !== 'string' || row.lessonId.trim() === '') continue
      if (typeof row.at !== 'number' || !Number.isFinite(row.at)) continue
      const present = Array.isArray(row.presentStudentIds)
        ? row.presentStudentIds.filter((id): id is string => typeof id === 'string' && id !== '')
        : []
      const absent = Array.isArray(row.absentStudentIds)
        ? row.absentStudentIds.filter((id): id is string => typeof id === 'string' && id !== '')
        : []
      sessions.push({
        lessonId: row.lessonId,
        at: row.at,
        presentStudentIds: present,
        absentStudentIds: absent,
      })
    }
    return sessions.sort((a, b) => b.at - a.at)
  } catch {
    return []
  }
}

function persist(sessions: readonly AttendanceSession[]): void {
  cache = sessions
  cacheIsFresh = true
  if (typeof window === 'undefined') {
    for (const listener of listeners) listener()
    return
  }
  try {
    window.localStorage.setItem(ATTENDANCE_HISTORY_KEY, JSON.stringify(sessions))
  } catch {
    /* memory only for this session */
  }
  for (const listener of listeners) listener()
}

/**
 * Who was present and who was marked absent from the Logbook's current marks.
 *
 * Present = roster members not in `absentStudentIds`. Absent = the Teacher's
 * marks. Students without an id (legacy name-only roll) are skipped — there is
 * nothing stable to join on.
 */
export function attendanceSnapshotFromBook(book: Logbook): {
  readonly presentStudentIds: readonly string[]
  readonly absentStudentIds: readonly string[]
} {
  const absent = new Set(book.absentStudentIds ?? [])
  const presentStudentIds: string[] = []
  const absentStudentIds: string[] = []
  for (const student of book.roster) {
    if (student.studentId === '') continue
    if (absent.has(student.studentId)) absentStudentIds.push(student.studentId)
    else presentStudentIds.push(student.studentId)
  }
  return { presentStudentIds, absentStudentIds }
}

/** Replace or insert one Lesson snapshot. Same lessonId wins; older rows stay. */
export function sealAttendance(session: AttendanceSession): void {
  const trimmedId = session.lessonId.trim()
  if (trimmedId === '') return
  const next: AttendanceSession = {
    lessonId: trimmedId,
    at: session.at,
    presentStudentIds: [...new Set(session.presentStudentIds.filter(Boolean))],
    absentStudentIds: [...new Set(session.absentStudentIds.filter(Boolean))],
  }
  const history = readAttendanceHistory().filter((row) => row.lessonId !== trimmedId)
  persist([next, ...history].sort((a, b) => b.at - a.at).slice(0, 200))
}

/** Seal from the open Logbook marks for a Lesson — Integrator calls this on close. */
export function sealAttendanceFromBook(lessonId: string, book: Logbook, at: number): void {
  const snap = attendanceSnapshotFromBook(book)
  sealAttendance({
    lessonId,
    at,
    presentStudentIds: snap.presentStudentIds,
    absentStudentIds: snap.absentStudentIds,
  })
}

/** Per-pupil tallies across every sealed session. Zero is shown, not hidden. */
export function attendanceCountsFor(
  history: readonly AttendanceSession[],
  studentId: string,
): AttendanceCounts {
  if (studentId.trim() === '') return EMPTY_ATTENDANCE_COUNTS
  let present = 0
  let absent = 0
  for (const session of history) {
    if (session.absentStudentIds.includes(studentId)) absent += 1
    else if (session.presentStudentIds.includes(studentId)) present += 1
  }
  return { present, absent }
}

/** Roster order — never reshuffles when counts change (DELIBERATE-POSITIONS 1). */
export function attendanceCountsByStudent(
  history: readonly AttendanceSession[],
  roster: readonly StudentRecord[],
): readonly (StudentRecord & { readonly counts: AttendanceCounts })[] {
  return roster.map((student) => ({
    ...student,
    counts: attendanceCountsFor(history, student.studentId),
  }))
}

export function formatAttendanceCounts(counts: AttendanceCounts): string {
  return `Present ${counts.present}, Absent ${counts.absent}`
}

/** Test helper — clears the side store without touching the Logbook. */
export function clearAttendanceHistory(): void {
  cache = []
  cacheIsFresh = true
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(ATTENDANCE_HISTORY_KEY)
    } catch {
      /* ignore */
    }
  }
  for (const listener of listeners) listener()
}
