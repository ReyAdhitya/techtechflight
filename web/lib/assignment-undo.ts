import type { DroneId } from '@techtechflight/contract'
import {
  assignStudent,
  clearStudents,
  readLogbook,
  studentOf,
  type Logbook,
} from './logbook'

/**
 * One step of undo for live Student ↔ Drone assignments.
 *
 * The Logbook itself has no history — so callers capture a point before they mutate
 * (`captureAssignmentUndoPoint` or `withAssignmentUndo`), and Undo restores that map
 * exactly. Depth is one: a second capture replaces the first; after undo there is
 * nothing further to undo.
 */

/** Drone → Student display name at the captured point. */
type AssignmentSnapshot = Readonly<Record<DroneId, string>>

let undoPoint: AssignmentSnapshot | null = null

function snapshotOf(book: Logbook): AssignmentSnapshot {
  const map: Record<DroneId, string> = {}
  for (const droneId of Object.keys(book.students) as DroneId[]) {
    const name = studentOf(book, droneId)
    if (name !== null) map[droneId] = name
  }
  return map
}

/** Remember who is flying what, before the next assignment change. */
export function captureAssignmentUndoPoint(book: Logbook = readLogbook()): void {
  undoPoint = snapshotOf(book)
}

export function canUndoAssignment(): boolean {
  return undoPoint !== null
}

/**
 * Restore the last captured assignment map exactly.
 *
 * Clears every live pairing, then re-applies the snapshot names. Returns false when
 * there is nothing to undo.
 */
export function undoLastAssignment(): boolean {
  if (undoPoint === null) return false
  const snapshot = undoPoint
  undoPoint = null

  clearStudents()
  for (const [droneId, name] of Object.entries(snapshot)) {
    assignStudent(droneId as DroneId, name)
  }
  return true
}

/** Capture, then run a mutation — the Integrator's one-liner around assign paths. */
export function withAssignmentUndo<T>(mutate: () => T): T {
  captureAssignmentUndoPoint()
  return mutate()
}

/** Test / Integrator escape hatch — forget any pending undo. */
export function clearAssignmentUndo(): void {
  undoPoint = null
}
