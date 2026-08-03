'use client'

import type { LessonRecord } from '@/lib/logbook'
import { downloadReportsCsv } from '@/lib/reports-csv'

/**
 * Download Lessons and incidents as a CSV a spreadsheet opens (#308 / F189).
 *
 * Unmounted until the Integrator wires it beside Download PDF on Reports.
 */
export function ReportsCsvButton({
  lessons,
}: {
  readonly lessons: readonly LessonRecord[]
}) {
  return (
    <button
      type="button"
      onClick={() => downloadReportsCsv({ lessons })}
      className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
    >
      Download CSV
    </button>
  )
}
