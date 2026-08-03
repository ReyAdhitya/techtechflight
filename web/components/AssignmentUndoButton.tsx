'use client'

import { canUndoAssignment, undoLastAssignment } from '@/lib/assignment-undo'

/**
 * One step of undo for the last assignment change.
 *
 * Hidden when there is nothing to undo — the Integrator must call
 * `captureAssignmentUndoPoint` / `withAssignmentUndo` before mutating assignments.
 * Mount on the Lesson screen beside the assignment column.
 */
export function AssignmentUndoButton({
  canUndo = canUndoAssignment(),
  onUndo,
}: {
  /** Override for tests / after a parent re-read of the undo stack. */
  readonly canUndo?: boolean
  readonly onUndo?: () => void
}) {
  if (!canUndo) return null

  return (
    <button
      type="button"
      onClick={() => {
        if (!undoLastAssignment()) return
        onUndo?.()
      }}
      className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
    >
      Undo last assignment
    </button>
  )
}
