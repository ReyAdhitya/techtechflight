'use client'

import { buildEndOfDayPayload, downloadEndOfDayExport } from '@/lib/end-of-day-export'
import type { LessonRecord } from '@/lib/logbook'

export function EndOfDayExportButton({ lessons }: { lessons: readonly LessonRecord[] }) {
  return (
    <button
      type="button"
      className="min-h-11 rounded-pill border border-hairline px-4 py-1.5 text-caption text-ink"
      onClick={() => downloadEndOfDayExport(buildEndOfDayPayload(lessons))}
    >
      Export todays lessons
    </button>
  )
}
