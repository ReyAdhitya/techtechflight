'use client'

import type { PupilFlightHours as Hours } from '@/lib/pupil-flight-hours'
import { formatAirborneDuration } from '@/lib/pupil-flight-hours'

/**
 * Accumulated airborne time for one Student across closed Lessons (#350 / F231).
 *
 * Integrator mounts on StudentsScreen / Reports with
 * `pupilAirborneMs(book, studentId)`. Zero renders as `0 min` (DELIBERATE-POSITIONS 3).
 */
export function PupilFlightHours({
  studentName,
  hours,
  approximate = false,
}: {
  readonly studentName: string
  readonly hours: Hours
  /** True when any Lesson used the wall-clock fallback rather than a seal. */
  readonly approximate?: boolean
}) {
  const label = formatAirborneDuration(hours.airborneMs)

  return (
    <section
      className="flex flex-col gap-1 rounded-surface border border-hairline bg-surface-1 px-3 py-2"
      aria-label={`Flight time for ${studentName}`}
    >
      <h3 className="label m-0">Flight time</h3>
      <p className="m-0 text-value text-ink">
        <span className="tnum">{label}</span>
        {' across '}
        <span className="tnum">{hours.lessonCount}</span>
        {hours.lessonCount === 1 ? ' Lesson' : ' Lessons'}
      </p>
      <p className="m-0 text-caption text-ink-subtle">
        {approximate
          ? 'Approximate. Lesson length when a takeoff was recorded; seal real intervals when available.'
          : 'Across closed Lessons in this browser.'}
      </p>
    </section>
  )
}
