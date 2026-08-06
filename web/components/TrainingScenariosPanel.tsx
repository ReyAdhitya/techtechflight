'use client'

import { useFleet } from './FleetProvider'
import { TRAINING_SCENARIOS, resetTraining } from '@/lib/training-scenarios'

/**
 * Named training scenarios — AED practice for the whole Teacher surface.
 *
 * Settings only. Never beside strip Commands (C9). Absent when the Fleet is real.
 */
export function TrainingScenariosPanel() {
  const { scenarios, snapshot } = useFleet()
  const drones = snapshot.state?.drones ?? []

  if (!scenarios || drones.length === 0) return null

  return (
    <section className="flex flex-col gap-4 rounded-surface border border-hairline bg-surface-1 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="label m-0">Training scenarios</h2>
        <p className="m-0 text-value text-ink-subtle">
          Named drills that make the simulated Fleet misbehave so every Teacher screen can be
          exercised. They are not Commands. Nothing here asks an aircraft to do something
          that could exist on hardware. See docs/training-scenarios.md.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => resetTraining(scenarios)}
          className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
        >
          Reset classroom
        </button>
      </div>

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {TRAINING_SCENARIOS.map((entry) => (
          <li
            key={entry.id}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-t border-hairline pt-3 first:border-t-0 first:pt-0"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-display text-value font-medium text-ink">
                {entry.id} · {entry.name}
              </span>
              <span className="text-label text-ink-muted">{entry.hits}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                resetTraining(scenarios)
                entry.run(scenarios)
              }}
              className="min-h-11 shrink-0 cursor-pointer rounded-pill border border-dashed border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted hover:border-ink hover:text-ink"
            >
              Run
            </button>
          </li>
        ))}
      </ul>

      <p className="m-0 text-label text-ink-muted">
        T9 (Lesson + Students) and T10 (Reports) are checklist steps. Assign, start a lesson,
        then run T1/T4 underneath. Full drill order: T9 → T1 → T2 → T5 → T10.
      </p>
    </section>
  )
}
