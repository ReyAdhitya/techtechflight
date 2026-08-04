import type { DroneId } from '@techtechflight/contract'
import { alertKey, type AlertKind, type DroneVitals } from './vitals.ts'

/**
 * The alert log — what happened during a Lesson, kept for the report.
 *
 * Each row carries when an Alert was raised and cleared, which craft, what kind it was,
 * and what the Teacher did about it. This is the durable record that exports with the
 * Lesson.
 *
 * Acknowledgement — working the Attention queue down — stays in memory only
 * (`AcknowledgementTracker`). Taking an Alert off the queue is not the same as the
 * condition having ended, and it must not rewrite history.
 */

export const ALERT_LOG_KEY = 'techtechflight:alert-log'

export interface AlertLogRecord {
  /** Stable while the condition lasts — `alertKey(droneId, kind)`. */
  readonly id: string
  readonly droneId: DroneId
  readonly droneName: string
  readonly kind: AlertKind
  /** What the Teacher should do, copied at raise time. */
  readonly text: string
  readonly raisedAt: number
  readonly clearedAt: number | null
  /** What the Teacher chose to do — a playbook label or their own words. */
  readonly teacherAction: string | null
}

export interface AlertLogState {
  readonly lessonId: string
  readonly records: readonly AlertLogRecord[]
}

type StoredAlertLog = Readonly<Record<string, readonly AlertLogRecord[]>>

function emptyState(lessonId: string): AlertLogState {
  return { lessonId, records: [] }
}

function loadAll(): StoredAlertLog {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(ALERT_LOG_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as StoredAlertLog
  } catch {
    return {}
  }
}

function persistAll(store: StoredAlertLog): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ALERT_LOG_KEY, JSON.stringify(store))
  } catch {
    /* memory only on locked-down browsers */
  }
}

function parseRecord(value: unknown): AlertLogRecord | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Partial<AlertLogRecord>
  if (typeof row.id !== 'string' || row.id.trim() === '') return null
  if (typeof row.droneId !== 'string' || row.droneId.trim() === '') return null
  if (typeof row.droneName !== 'string') return null
  if (typeof row.kind !== 'string') return null
  if (typeof row.text !== 'string') return null
  if (typeof row.raisedAt !== 'number' || !Number.isFinite(row.raisedAt)) return null
  const clearedAt =
    row.clearedAt === null || row.clearedAt === undefined
      ? null
      : typeof row.clearedAt === 'number' && Number.isFinite(row.clearedAt)
        ? row.clearedAt
        : null
  const teacherAction =
    row.teacherAction === null || row.teacherAction === undefined
      ? null
      : typeof row.teacherAction === 'string' && row.teacherAction.trim() !== ''
        ? row.teacherAction.trim()
        : null
  return {
    id: row.id,
    droneId: row.droneId,
    droneName: row.droneName,
    kind: row.kind as AlertKind,
    text: row.text,
    raisedAt: row.raisedAt,
    clearedAt,
    teacherAction,
  }
}

/** Read the alert log for one Lesson from this browser. */
export function readAlertLog(lessonId: string): AlertLogState {
  const rows = loadAll()[lessonId] ?? []
  const records: AlertLogRecord[] = []
  for (const row of rows) {
    const parsed = parseRecord(row)
    if (parsed !== null && !records.some((existing) => existing.id === parsed.id)) {
      records.push(parsed)
    }
  }
  return { lessonId, records }
}

export function writeAlertLog(state: AlertLogState): AlertLogState {
  const store = loadAll()
  persistAll({ ...store, [state.lessonId]: state.records })
  return state
}

/** Export shape for merging into a Lesson record at close. */
export function alertLogForLesson(lessonId: string): readonly AlertLogRecord[] {
  return readAlertLog(lessonId).records
}

function upsertRecord(
  state: AlertLogState,
  record: AlertLogRecord,
): AlertLogState {
  const index = state.records.findIndex((row) => row.id === record.id)
  if (index === -1) {
    return { ...state, records: [...state.records, record] }
  }
  const records = state.records.slice()
  records[index] = record
  return { ...state, records }
}

/** Sync live vitals into the Lesson log — raise new Alerts and close cleared ones. */
export function observeAlertLog(
  state: AlertLogState,
  vitals: readonly DroneVitals[],
  now: number,
): AlertLogState {
  let next = state
  const live = new Set<string>()

  for (const entry of vitals) {
    for (const alert of entry.alerts) {
      const id = alertKey(entry.droneId, alert.kind)
      live.add(id)
      const existing = next.records.find((row) => row.id === id)
      if (existing === undefined) {
        next = upsertRecord(next, {
          id,
          droneId: entry.droneId,
          droneName: entry.callsign,
          kind: alert.kind,
          text: alert.text,
          raisedAt: alert.since,
          clearedAt: null,
          teacherAction: null,
        })
        continue
      }
      if (existing.clearedAt !== null) {
        // Same kind returned after it cleared — new episode, new raised time.
        next = upsertRecord(next, {
          ...existing,
          droneName: entry.callsign,
          text: alert.text,
          raisedAt: alert.since,
          clearedAt: null,
          teacherAction: null,
        })
      }
    }
  }

  for (const row of next.records) {
    if (row.clearedAt !== null) continue
    if (live.has(row.id)) continue
    next = upsertRecord(next, { ...row, clearedAt: now })
  }

  return next
}

/** Record what the Teacher did about one Alert — persisted on the Lesson. */
export function recordAlertTeacherAction(
  state: AlertLogState,
  droneId: DroneId,
  kind: AlertKind,
  action: string,
): AlertLogState {
  const trimmed = action.trim()
  if (trimmed === '') return state

  const id = alertKey(droneId, kind)
  const existing = state.records.find((row) => row.id === id)
  if (existing === undefined) return state

  return writeAlertLog(
    upsertRecord(state, {
      ...existing,
      teacherAction: trimmed,
    }),
  )
}

/** Clear the in-browser log for tests or when a Lesson is discarded. */
export function clearAlertLog(lessonId?: string): void {
  if (typeof window === 'undefined') return
  if (lessonId === undefined) {
    window.localStorage.removeItem(ALERT_LOG_KEY)
    return
  }
  const store = { ...loadAll() }
  delete store[lessonId]
  persistAll(store)
}

/** Whether acknowledgement belongs here — it does not; it stays in memory only. */
export function alertLogIsPersistent(): true {
  return true
}
