'use client'

import { FleetReliability } from './MaintenanceScreen'
import { HistorySections } from './HistoryScreen'
import { LessonReports } from './LessonReports'
import { cn } from '@/lib/utils'
import { READING_FRAME } from '@/lib/frame'

/**
 * The screen a Teacher reads afterwards.
 *
 * Three questions that all belong to the same moment — the ten minutes at the end of the
 * day — gathered instead of scattered. What happened in each Lesson, which Drone keeps
 * giving trouble, and the timeline underneath both.
 *
 * History and the reliability ranking come from two separate screens that were reached
 * from the primary navigation. Both are about the past, and neither is something a Teacher
 * opens while six Drones are up.
 */
export function ReportsScreen() {
  return (
    <main
      id="content"
      tabIndex={-1}
      className={cn(READING_FRAME, 'flex flex-col gap-10 p-4 min-[26rem]:p-8')}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h1 className="m-0 font-display text-summary font-medium">Reports</h1>
        <button
          type="button"
          onClick={() => window.print()}
          className="print-hide min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
        >
          Print
        </button>
      </div>

      {/*
        * A printed page has no navigation and no context. It says what it is and when it
        * was printed, because a sheet of paper on a desk next term has nothing else to go
        * on. Only ever visible on paper.
        */}
      <p className="print-only m-0 text-value">TechTech Flight — Lesson records</p>

      <LessonReports />

      <div className="border-t border-hairline pt-8">
        <FleetReliability />
      </div>

      <div className="print-hide flex flex-col gap-3 border-t border-hairline pt-8">
        <HistorySections />
      </div>
    </main>
  )
}
