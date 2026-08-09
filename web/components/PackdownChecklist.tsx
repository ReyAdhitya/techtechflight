'use client'

import { useState } from 'react'
import type { DroneId } from '@techtechflight/contract'
import {
  emptyPackdownChecklist,
  ensurePackdownLesson,
  isPackdownTicked,
  packdownCounts,
  togglePackdownTick,
  type PackdownChecklistState,
  type PackdownCraft,
} from '@/lib/packdown-checklist'

/**
 * One tickable row per craft at lesson close — packed or still out, in words.
 *
 * Order follows the craft list the parent passes (board order). Ticks never reorder
 * the rows (DELIBERATE-POSITIONS 1). Scoped to the lesson so Period 4 starts clean.
 */
export function PackdownChecklist({
  lessonId,
  crafts,
  onChange,
}: {
  readonly lessonId: string
  readonly crafts: readonly PackdownCraft[]
  readonly onChange?: (state: PackdownChecklistState) => void
}) {
  const [state, setState] = useState(() => emptyPackdownChecklist(lessonId))
  const checklist = ensurePackdownLesson(state, lessonId)
  const counts = packdownCounts(checklist, crafts)

  const toggle = (droneId: DroneId) => {
    const next = togglePackdownTick(checklist, droneId)
    setState(next)
    onChange?.(next)
  }

  return (
    <section
      className="flex flex-col gap-3 rounded-surface border border-hairline bg-surface-1 p-4"
      aria-labelledby="packdown-checklist-title"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="packdown-checklist-title" className="label m-0">
          Pack-down
        </h2>
        <p className="m-0 tnum text-value text-ink-subtle" role="status">
          {counts.ticked} of {counts.total} packed
        </p>
      </div>

      {crafts.length === 0 ? (
        <p className="m-0 text-value text-ink-subtle">No Drones on the list.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-0 p-0">
          {crafts.map((craft) => {
            const ticked = isPackdownTicked(checklist, craft.droneId)
            const inputId = `packdown-${craft.droneId}`
            return (
              <li
                key={craft.droneId}
                className="flex min-h-11 items-center gap-3 border-b border-hairline py-1 last:border-b-0"
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={ticked}
                  onChange={() => toggle(craft.droneId)}
                  className="size-4 shrink-0"
                />
                <label
                  htmlFor={inputId}
                  className="flex min-w-0 flex-1 cursor-pointer flex-wrap items-baseline gap-x-2 gap-y-0.5 text-value text-ink"
                >
                  <span className="font-medium">{craft.droneName}</span>
                  <span className="text-ink-muted">{ticked ? 'Packed' : 'Still out'}</span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
