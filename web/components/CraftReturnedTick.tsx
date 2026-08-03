'use client'

import { useState } from 'react'
import type { DroneId } from '@techtechflight/contract'
import {
  craftReturnedHeadcount,
  emptyCraftReturned,
  ensureCraftReturnedLesson,
  isCraftReturned,
  toggleCraftReturned,
  type CraftRef,
  type CraftReturnedState,
} from '@/lib/craft-returned'

/**
 * Headcount out at pack-down — tick each craft returned; name any still missing.
 *
 * Counts render at zero (DELIBERATE-POSITIONS 3). Missing craft are named in words,
 * not colour alone (ADR-0004). Order follows the craft list the parent passes.
 */
export function CraftReturnedTick({
  lessonId,
  crafts,
  onChange,
}: {
  readonly lessonId: string
  readonly crafts: readonly CraftRef[]
  readonly onChange?: (state: CraftReturnedState) => void
}) {
  const [state, setState] = useState(() => emptyCraftReturned(lessonId))
  const checklist = ensureCraftReturnedLesson(state, lessonId)
  const head = craftReturnedHeadcount(checklist, crafts)

  const toggle = (droneId: DroneId) => {
    const next = toggleCraftReturned(checklist, droneId)
    setState(next)
    onChange?.(next)
  }

  const missingNames =
    head.missing.length === 0
      ? 'None missing'
      : `Missing: ${head.missing.map((craft) => craft.droneName).join(', ')}`

  return (
    <section
      className="flex flex-col gap-3 rounded-surface border border-hairline bg-surface-1 p-4"
      aria-labelledby="craft-returned-title"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="craft-returned-title" className="label m-0">
          Craft returned
        </h2>
        <p className="m-0 tnum text-value text-ink-subtle" role="status">
          {head.returned} of {head.out} returned
        </p>
      </div>

      <p className="m-0 text-value text-ink" aria-live="polite">
        {missingNames}
      </p>

      {crafts.length === 0 ? (
        <p className="m-0 text-value text-ink-subtle">No craft went out.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-0 p-0">
          {crafts.map((craft) => {
            const returned = isCraftReturned(checklist, craft.droneId)
            const inputId = `craft-returned-${craft.droneId}`
            return (
              <li
                key={craft.droneId}
                className="flex min-h-11 items-center gap-3 border-b border-hairline py-1 last:border-b-0"
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={returned}
                  onChange={() => toggle(craft.droneId)}
                  className="size-4 shrink-0"
                />
                <label
                  htmlFor={inputId}
                  className="flex min-w-0 flex-1 cursor-pointer flex-wrap items-baseline gap-x-2 gap-y-0.5 text-value text-ink"
                >
                  <span className="font-medium">{craft.droneName}</span>
                  <span className="text-ink-muted">{returned ? 'Returned' : 'Still out'}</span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
