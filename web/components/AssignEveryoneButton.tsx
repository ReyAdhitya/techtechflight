'use client'

import { useState } from 'react'
import type { DroneId } from '@techtechflight/contract'
import { assignEveryone } from '@/lib/assign-everyone'
import { withAssignmentUndo } from '@/lib/assignment-undo'

/**
 * One tap hands every free craft to the next names on the roster, in board order.
 *
 * Reports how many were assigned after the press — a number changing, not a layout
 * event (DELIBERATE-POSITIONS 3). Mount beside the Lesson assignment column.
 */
export function AssignEveryoneButton({
  droneIds,
}: {
  readonly droneIds: readonly DroneId[]
}) {
  const [assignedCount, setAssignedCount] = useState(0)
  const [hasRun, setHasRun] = useState(false)

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <button
        type="button"
        onClick={() => {
          setAssignedCount(withAssignmentUndo(() => assignEveryone(droneIds)))
          setHasRun(true)
        }}
        className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
      >
        Assign everyone
      </button>
      {hasRun && (
        <p className="m-0 text-value text-ink-subtle" role="status">
          Assigned <span className="tnum font-medium text-ink">{assignedCount}</span>
        </p>
      )}
    </div>
  )
}
