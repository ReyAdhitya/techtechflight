'use client'
import { useState } from 'react'
const STEPS = ['Power off', 'Swap pack', 'Seat latch', 'Power on', 'Confirm charge read'] as const
export function BatterySwapChecklist() {
  const [done, setDone] = useState<Record<string, boolean>>({})
  return (
    <section className="flex flex-col gap-2" aria-label="Battery swap checklist">
      <h2 className="label m-0">Battery swap</h2>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {STEPS.map((step) => (
          <li key={step}>
            <label className="flex min-h-11 items-center gap-2 text-body text-ink">
              <input type="checkbox" checked={!!done[step]} onChange={() => setDone((d) => ({ ...d, [step]: !d[step] }))} />
              {step}
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}
