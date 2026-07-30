'use client'
import { formatWeeklyDigest } from '@/lib/weekly-digest'
import type { LessonRecord } from '@/lib/logbook'

export function WeeklyDigest({ lessons }: { lessons: readonly LessonRecord[] }) {
  return (
    <p className="m-0 text-body text-ink-subtle" role="status" aria-label="Weekly digest">
      {formatWeeklyDigest(lessons)}
    </p>
  )
}
