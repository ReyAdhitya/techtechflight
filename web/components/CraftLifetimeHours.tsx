'use client'

import type { LessonRecord } from '@/lib/logbook'
import {
  craftLifetimeHours,
  formatLifetimeHours,
} from '@/lib/craft-lifetime-hours'

/**
 * Lifetime airborne hours per craft, from every closed Lesson (#310 / F191).
 *
 * Unmounted until the Integrator places it on Reports beside Fleet reliability.
 */
export function CraftLifetimeHours({
  lessons,
}: {
  readonly lessons: readonly LessonRecord[]
}) {
  const rows = craftLifetimeHours(lessons)

  return (
    <section className="flex flex-col gap-3" aria-label="Lifetime hours per craft">
      <h2 className="label m-0">Lifetime hours</h2>
      <p className="m-0 max-w-prose text-value text-ink-subtle">
        Accumulated Lesson time for each craft that took off, across every closed Lesson.
      </p>

      {rows.length === 0 ? (
        <p className="m-0 text-value text-ink-subtle">
          No closed Lesson has recorded a takeoff yet. Hours accumulate when a Lesson ends.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {rows.map((row) => (
            <li
              key={row.droneId}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-hairline pb-2 text-value text-ink"
            >
              <span className="font-display font-medium">{row.droneName}</span>
              <span className="tnum text-ink-subtle">{formatLifetimeHours(row.hours)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
