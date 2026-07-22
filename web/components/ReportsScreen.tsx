'use client'

import { FleetReliability } from './MaintenanceScreen'
import { HistorySections } from './HistoryScreen'
import { LessonReports } from './LessonReports'

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
      className="mx-auto flex w-full max-w-5xl flex-col gap-10 p-4 min-[26rem]:p-8"
    >
      <h1 className="m-0 font-display text-summary font-medium">Reports</h1>

      <LessonReports />

      <div className="border-t border-hairline pt-8">
        <FleetReliability />
      </div>

      <div className="flex flex-col gap-3 border-t border-hairline pt-8">
        <HistorySections />
      </div>
    </main>
  )
}
