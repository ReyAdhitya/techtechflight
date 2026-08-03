'use client'

import { useState } from 'react'
import type { DroneId } from '@techtechflight/contract'
import {
  batteryOnChargeSummary,
  emptyBatteryOnCharge,
  ensureBatteryOnChargeLesson,
  isBatteryOnCharge,
  toggleBatteryOnCharge,
  type BatteryOnChargeState,
  type BatteryPackRef,
} from '@/lib/battery-oncharge'

/**
 * Tick which packs went back on charge at pack-down.
 *
 * Records the cupboard state in words — on charge / place on charge — so colour is
 * never the sole carrier (ADR-0004). Order follows the pack list the parent passes.
 */
export function BatteryOnChargeTick({
  lessonId,
  packs,
  onChange,
}: {
  readonly lessonId: string
  readonly packs: readonly BatteryPackRef[]
  readonly onChange?: (state: BatteryOnChargeState) => void
}) {
  const [state, setState] = useState(() => emptyBatteryOnCharge(lessonId))
  const checklist = ensureBatteryOnChargeLesson(state, lessonId)
  const summary = batteryOnChargeSummary(checklist, packs)

  const toggle = (droneId: DroneId) => {
    const next = toggleBatteryOnCharge(checklist, droneId)
    setState(next)
    onChange?.(next)
  }

  return (
    <section
      className="flex flex-col gap-3 rounded-surface border border-hairline bg-surface-1 p-4"
      aria-labelledby="battery-oncharge-title"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="battery-oncharge-title" className="label m-0">
          Back on charge
        </h2>
        <p className="m-0 tnum text-value text-ink-subtle" role="status">
          {summary.onChargeCount} of {summary.total} on charge
        </p>
      </div>

      {packs.length === 0 ? (
        <p className="m-0 text-value text-ink-subtle">No packs on the list.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-0 p-0">
          {packs.map((pack) => {
            const onCharge = isBatteryOnCharge(checklist, pack.droneId)
            const inputId = `battery-oncharge-${pack.droneId}`
            return (
              <li
                key={pack.droneId}
                className="flex min-h-11 items-center gap-3 border-b border-hairline py-1 last:border-b-0"
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={onCharge}
                  onChange={() => toggle(pack.droneId)}
                  className="size-4 shrink-0"
                />
                <label
                  htmlFor={inputId}
                  className="flex min-w-0 flex-1 cursor-pointer flex-wrap items-baseline gap-x-2 gap-y-0.5 text-value text-ink"
                >
                  <span className="font-medium">{pack.droneName}</span>
                  <span className="text-ink-muted">
                    {onCharge ? 'On charge' : 'Place on charge'}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
