'use client'

import { useState } from 'react'
import type { DroneId } from '@techtechflight/contract'
import { swapStudentAssignments } from '@/lib/logbook'

export interface SwapPupilOption {
  readonly droneId: DroneId
  readonly droneName: string
  readonly studentName: string | null
}

/**
 * Swap who is flying two Drones in one action.
 *
 * Wraps `swapStudentAssignments` — the same exchange Control strips already use — so both
 * strips update when the parent re-reads the Logbook. Mount on Lesson or Control; order of
 * the option list must stay board order (DELIBERATE-POSITIONS 1).
 */
export function SwapPupilsControl({
  options,
  onSwapped,
}: {
  readonly options: readonly SwapPupilOption[]
  readonly onSwapped?: () => void
}) {
  const [firstId, setFirstId] = useState<DroneId | ''>('')
  const [secondId, setSecondId] = useState<DroneId | ''>('')

  const canSwap = firstId !== '' && secondId !== '' && firstId !== secondId

  return (
    <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
      <label className="flex flex-col gap-1">
        <span className="label">First Student</span>
        <select
          value={firstId}
          onChange={(event) => setFirstId(event.target.value as DroneId | '')}
          className="min-h-11 min-w-40 rounded-pill border border-hairline bg-canvas px-3 py-1 text-value text-ink"
        >
          <option value="">Choose a craft</option>
          {options.map((option) => (
            <option key={option.droneId} value={option.droneId}>
              {labelFor(option)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="label">Second Student</span>
        <select
          value={secondId}
          onChange={(event) => setSecondId(event.target.value as DroneId | '')}
          className="min-h-11 min-w-40 rounded-pill border border-hairline bg-canvas px-3 py-1 text-value text-ink"
        >
          <option value="">Choose a craft</option>
          {options.map((option) => (
            <option key={option.droneId} value={option.droneId}>
              {labelFor(option)}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        disabled={!canSwap}
        onClick={() => {
          if (!canSwap) return
          swapStudentAssignments(firstId, secondId)
          onSwapped?.()
        }}
        className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink disabled:cursor-not-allowed disabled:text-ink-muted disabled:hover:border-hairline"
      >
        Swap Students
      </button>
    </div>
  )
}

function labelFor(option: SwapPupilOption): string {
  if (option.studentName === null || option.studentName === '') {
    return `${option.droneName} — unassigned`
  }
  return `${option.droneName} — ${option.studentName}`
}
