'use client'

import { useRef, useSyncExternalStore } from 'react'
import { WeeklyDigest } from './WeeklyDigest'
import { EndOfDayExportButton } from './EndOfDayExportButton'
import { FleetReliability, rankFleetReliability } from './MaintenanceScreen'
import { HistorySections } from './HistoryScreen'
import { LessonReports } from './LessonReports'
import { LogbookLocationNote } from './LogbookLocationNote'
import { ReportsCsvButton } from './ReportsCsvButton'
import { CraftLifetimeHours } from './CraftLifetimeHours'
import { LessonOnePager } from './LessonOnePager'
import { MissionReport } from './MissionReport'
import { useFleet } from './FleetProvider'
import {
  downloadReportsPdf,
  REPORTS_PDF_TITLE,
} from '@/lib/reports-pdf'
import {
  formatCeilingBreachCount,
  readLessonCeilingBreachCount,
} from '@/lib/ceiling-breach-count'
import {
  missionsFrom,
  readLogbook,
  readServerLogbook,
  subscribeLogbook,
} from '@/lib/logbook'
import { cn } from '@/lib/utils'
import { READING_FRAME } from '@/lib/frame'

const PRINT_TITLE = REPORTS_PDF_TITLE

/**
 * Open the browser print dialog with a document title that belongs on paper.
 *
 * Secondary to Download PDF (#92). The URL and clock in the preview are the browser's
 * own Headers and footers — CSS cannot remove them. Teachers who still Print should
 * turn Headers and footers off under More settings.
 */
function printReports(stamp: HTMLElement | null): void {
  if (stamp) {
    const when = new Date()
    stamp.setAttribute('datetime', when.toISOString())
    stamp.textContent = when.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  const previous = document.title
  document.title = PRINT_TITLE
  const restore = () => {
    document.title = previous
    window.removeEventListener('afterprint', restore)
  }
  window.addEventListener('afterprint', restore)
  window.print()
}

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
  const printedAtRef = useRef<HTMLTimeElement>(null)
  const { snapshot } = useFleet()
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)
  const closed = book.lessons.filter((lesson) => lesson.endedAt !== null)
  const latestClosed = closed[0] ?? null

  function onDownloadPdf() {
    const drones = snapshot.state?.drones ?? []
    const events = snapshot.history?.events ?? []
    const ranked = rankFleetReliability(drones, events, book)
    downloadReportsPdf({
      lessons: book.lessons,
      defects: ranked.map((entry) => ({
        name: entry.drone.name,
        faults: entry.faults,
        dropouts: entry.dropouts,
        flights: entry.flights,
      })),
    })
  }

  return (
    <main
      id="content"
      tabIndex={-1}
      className={cn(READING_FRAME, 'flex flex-col gap-10 p-4 min-[26rem]:p-8')}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h1 className="m-0 font-display text-summary font-medium">Reports</h1>
        <div className="print-hide flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onDownloadPdf}
            className="min-h-11 cursor-pointer rounded-pill border-0 bg-ink px-4 py-1.5 text-value font-medium text-canvas hover:opacity-90"
          >
            Download PDF
          </button>
          <ReportsCsvButton lessons={book.lessons} />
          <button
            type="button"
            onClick={() => printReports(printedAtRef.current)}
            className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
          >
            Print
          </button>
        </div>
      </div>

      <p className="print-hide m-0 max-w-prose text-value text-ink-subtle">
        Download PDF saves a file with the Lessons and recurring defects — no browser page
        URL or clock on the sheet. Print remains available; if you use it, turn off Headers
        and footers under More settings.
      </p>

      <div className="print-hide">
        <LogbookLocationNote />
      </div>

      {/*
       * A printed page has no navigation and no context. It says what it is and when it
       * was printed, because a sheet of paper on a desk next term has nothing else to go
       * on. Only ever visible on paper.
       */}
      <header className="print-only print-report-header">
        <p className="m-0 font-display text-heading font-medium">{PRINT_TITLE}</p>
        <p className="m-0 text-value">
          Printed <time ref={printedAtRef} />
        </p>
      </header>

      <LessonReports />

      {closed.some((lesson) => missionsFrom(lesson).length > 0) && (
        <section className="flex flex-col gap-3 border-t border-hairline pt-8">
          <h2 className="label m-0">Missions</h2>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {closed
              .filter((lesson) => missionsFrom(lesson).length > 0)
              .slice(0, 20)
              .map((lesson) => (
                <li key={lesson.id}>
                  <MissionReport lesson={lesson} />
                </li>
              ))}
          </ul>
        </section>
      )}

      {closed.length > 0 && (
        <section className="print-hide flex flex-col gap-2 border-t border-hairline pt-8">
          <h2 className="label m-0">Ceiling breaches</h2>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {closed.slice(0, 12).map((lesson) => {
              const count = readLessonCeilingBreachCount(lesson.id)
              return (
                <li key={lesson.id} className="text-value text-ink-subtle">
                  <span className="font-medium text-ink">{lesson.label}</span>
                  {' — '}
                  <span className="tnum">{formatCeilingBreachCount(count)}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <div className="print-hide border-t border-hairline pt-8">
        <CraftLifetimeHours lessons={book.lessons} />
      </div>

      {latestClosed && (
        <div className="print-hide border-t border-hairline pt-8">
          <LessonOnePager lesson={latestClosed} />
        </div>
      )}

      <div className="border-t border-hairline pt-8">
        <FleetReliability />
      </div>

      <div className="print-hide flex flex-col gap-3 border-t border-hairline pt-8">
        <HistorySections />
      </div>
      <EndOfDayExportButton lessons={book.lessons} />
      <WeeklyDigest lessons={book.lessons} />
    </main>
  )
}
