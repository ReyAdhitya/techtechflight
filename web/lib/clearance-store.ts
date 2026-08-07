import { emptyClearanceState, type ClearanceState } from './clearance.ts'

/**
 * Where takeoff clearances live between screens.
 *
 * `clearance.ts` is pure and stays that way: it decides who is waiting and what granting
 * means. This is the one line of storage it was missing, which is why the queue was built,
 * tested, and never mounted on a screen.
 *
 * Its own key, like the other side records. Clearances are not Telemetry and they are not
 * Logbook rows; they are the Teacher's answer on record for one Lesson (ADR-0021).
 */

export const CLEARANCES_KEY = 'techtechflight:clearances'

interface StoredClearances {
  readonly lessonId: string | null
  readonly state: ClearanceState
}

/** Clearances granted in another Lesson do not carry into this one. */
export function readClearances(lessonId: string | null): ClearanceState {
  if (typeof window === 'undefined') return emptyClearanceState()
  try {
    const raw = window.localStorage.getItem(CLEARANCES_KEY)
    if (!raw) return emptyClearanceState()
    const parsed = JSON.parse(raw) as Partial<StoredClearances>
    if (parsed.lessonId !== lessonId) return emptyClearanceState()
    const records = parsed.state?.records
    if (!Array.isArray(records)) return emptyClearanceState()
    /*
     * Hold arrived after clearances were already being written, so a Lesson stored before
     * it has records with no `heldAt` at all. Absent is not held, and `undefined !== null`
     * would have read every one of them as held.
     */
    return {
      records: records.map((record) => ({
        ...record,
        heldAt: record.heldAt ?? null,
        heldBy: record.heldBy ?? null,
      })),
    }
  } catch {
    return emptyClearanceState()
  }
}

export function writeClearances(
  lessonId: string | null,
  state: ClearanceState,
): ClearanceState {
  if (typeof window === 'undefined') return state
  try {
    window.localStorage.setItem(CLEARANCES_KEY, JSON.stringify({ lessonId, state }))
  } catch {
    // A full or blocked store must not take the board down mid-lesson.
  }
  return state
}

/** Whether any craft has been cleared for takeoff on this Mission. */
export function anyClearanceGranted(state: ClearanceState, missionId: string): boolean {
  return state.records.some(
    (record) =>
      record.missionId === missionId &&
      record.grantedAt !== null &&
      record.endedAt === null,
  )
}
