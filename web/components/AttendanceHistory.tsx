'use client'

import type { AttendanceCounts } from '@/lib/attendance-history'

/**
 * Present and absent tallies for one Student across sealed Lessons (#340 / F221).
 *
 * Pure view — the Integrator mounts this on Students (or a pupil page) and passes
 * counts from `attendanceCountsFor(readAttendanceHistory(), studentId)`. Counts
 * render at zero (DELIBERATE-POSITIONS 3). Colour never carries the meaning alone
 * (ADR-0004): the words "present" and "absent" sit beside the numbers.
 */
export function AttendanceHistory({
  studentName,
  counts,
}: {
  readonly studentName: string
  readonly counts: AttendanceCounts
}) {
  return (
    <section
      className="flex flex-col gap-1 rounded-surface border border-hairline bg-surface-1 px-3 py-2"
      aria-label={`Attendance for ${studentName}`}
    >
      <h3 className="label m-0">Attendance</h3>
      <p className="m-0 text-value text-ink">
        <span className="tnum">{counts.present}</span>
        {' present, '}
        <span className="tnum">{counts.absent}</span>
        {' absent'}
      </p>
      <p className="m-0 text-caption text-ink-subtle">Across sealed Lessons in this browser.</p>
    </section>
  )
}
