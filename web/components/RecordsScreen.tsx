'use client'

import { useState, useSyncExternalStore } from 'react'
import { readLogbook, readServerLogbook, subscribeLogbook } from '@/lib/logbook'
import {
  readAttendanceHistory,
  readServerAttendanceHistory,
  subscribeAttendanceHistory,
} from '@/lib/attendance-history'
import {
  formatAirborneDuration,
  readPupilFlightSeals,
  readServerPupilFlightSeals,
  subscribePupilFlightHours,
} from '@/lib/pupil-flight-hours'
import { readPupilNotes, readServerPupilNotes, subscribePupilNotes } from '@/lib/pupil-notes'
import { childHistory, classList, type ChildLesson, type ChildRow } from '@/lib/records'
import { cn } from '@/lib/utils'

/**
 * Records: **a class list, and one child's history**. Two questions, and no more (ADR-0034).
 *
 * Not a third screen, not a dashboard, and no chart. A Teacher opens this to ask *how is the
 * class doing* or *how is this child doing*, and anything answering neither is something they
 * read past on the way to what they came for.
 *
 * Every figure comes from this browser, which is the record. The database is a copy and this
 * screen neither waits on it nor reports on it; where records are stored is said on Settings.
 */
export function RecordsScreen() {
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)
  const attendance = useSyncExternalStore(
    subscribeAttendanceHistory,
    readAttendanceHistory,
    readServerAttendanceHistory,
  )
  const flightSeals = useSyncExternalStore(
    subscribePupilFlightHours,
    readPupilFlightSeals,
    readServerPupilFlightSeals,
  )
  const notes = useSyncExternalStore(subscribePupilNotes, readPupilNotes, readServerPupilNotes)

  const [openStudentId, setOpenStudentId] = useState<string | null>(null)

  const sources = { book, attendance, flightSeals, notes }
  const rows = classList(sources)
  const open = rows.find((row) => row.studentId === openStudentId) ?? null

  if (open !== null) {
    return (
      <OneChild
        child={open}
        lessons={childHistory(sources, open.studentId)}
        onBack={() => setOpenStudentId(null)}
      />
    )
  }

  return <TheClass rows={rows} onOpen={setOpenStudentId} />
}

/**
 * The class list: a name, how many flights, how long, and how they are doing.
 *
 * Present and Absent are counted from **sealed** Lessons only. A Lesson whose attendance was
 * never sealed is not a Lesson everybody attended, and counting it as one would put a number on
 * this screen that no Teacher entered.
 */
function TheClass({
  rows,
  onOpen,
}: {
  readonly rows: readonly ChildRow[]
  readonly onOpen: (studentId: string) => void
}) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="records-class-heading">
      <div className="flex flex-col gap-1">
        <h1 id="records-class-heading" className="m-0 font-display text-summary font-medium">
          Records
        </h1>
        <p className="m-0 max-w-[62ch] text-value text-ink-subtle">
          Everyone on the roll. Tap a name for what they have done.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="m-0 text-body text-ink-subtle">
          Nobody on the roll yet. Add the class on Students.
        </p>
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full border-collapse text-value">
            <thead>
              <tr className="border-b border-hairline text-left">
                <Th>Name</Th>
                <Th numeric>Flights</Th>
                <Th numeric>Time flown</Th>
                <Th numeric>Present</Th>
                <Th numeric>Absent</Th>
                <Th>Note</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.studentId} className="border-b border-hairline align-baseline">
                  <td className="py-2 pr-4">
                    <button
                      type="button"
                      onClick={() => onOpen(row.studentId)}
                      className="min-h-11 cursor-pointer border-0 bg-transparent p-0 text-left font-display text-value font-medium text-ink underline decoration-hairline underline-offset-4 hover:decoration-ink"
                    >
                      {row.name}
                    </button>
                  </td>
                  <Td numeric>{row.flights}</Td>
                  <Td numeric>{formatAirborneDuration(row.airborneMs)}</Td>
                  <Td numeric>{row.present}</Td>
                  <Td numeric>{row.absent}</Td>
                  <td className="max-w-[24ch] truncate py-2 text-ink-subtle">{row.note ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/**
 * One child, Lesson by Lesson, newest first.
 *
 * A Lesson with no attendance seal reads **Not marked** rather than Present or Absent. An
 * unsealed Lesson is one nobody answered for, and printing a guess where a Teacher's mark
 * belongs is the failure this screen exists to avoid.
 */
function OneChild({
  child,
  lessons,
  onBack,
}: {
  readonly child: ChildRow
  readonly lessons: readonly ChildLesson[]
  readonly onBack: () => void
}) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="records-child-heading">
      <button
        type="button"
        onClick={onBack}
        className="min-h-11 w-fit cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
      >
        Back to the class
      </button>

      <div className="flex flex-col gap-1">
        <h1 id="records-child-heading" className="m-0 font-display text-summary font-medium">
          {child.name}
        </h1>
        <p className="m-0 flex flex-wrap gap-x-4 text-value text-ink-subtle">
          <span>
            <span className="tnum text-ink">{child.flights}</span> flights
          </span>
          <span>
            <span className="tnum text-ink">{formatAirborneDuration(child.airborneMs)}</span>{' '}
            flown
          </span>
          <span>
            Present <span className="tnum text-ink">{child.present}</span>
          </span>
          <span>
            Absent <span className="tnum text-ink">{child.absent}</span>
          </span>
        </p>
      </div>

      {child.note === null ? null : (
        <p className="m-0 max-w-[62ch] rounded-surface border border-hairline bg-surface-1 px-4 py-3 text-body text-ink">
          {child.note}
        </p>
      )}

      {lessons.length === 0 ? (
        <p className="m-0 text-body text-ink-subtle">
          Nothing recorded yet. A Lesson appears here once it is closed.
        </p>
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full border-collapse text-value">
            <thead>
              <tr className="border-b border-hairline text-left">
                <Th>Date</Th>
                <Th>Lesson</Th>
                <Th>In the room</Th>
                <Th numeric>Time flown</Th>
              </tr>
            </thead>
            <tbody>
              {lessons.map((row) => (
                <tr key={row.lessonId} className="border-b border-hairline align-baseline">
                  <td className="tnum py-2 pr-4 text-ink-subtle">
                    {new Date(row.startedAt).toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-4 text-ink">{row.label}</td>
                  <td className="py-2 pr-4">
                    {row.present === null ? (
                      <span className="text-ink-muted">Not marked</span>
                    ) : row.present ? (
                      'Present'
                    ) : (
                      <span className="text-status-not-ready">Absent</span>
                    )}
                  </td>
                  <Td numeric>{formatAirborneDuration(row.airborneMs)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function Th({
  children,
  numeric = false,
}: {
  readonly children: React.ReactNode
  readonly numeric?: boolean
}) {
  return (
    <th
      scope="col"
      className={cn('label py-2 pr-4 font-normal', numeric && 'pl-4 pr-0 text-right')}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  numeric = false,
}: {
  readonly children: React.ReactNode
  readonly numeric?: boolean
}) {
  return (
    <td className={cn('py-2 pr-4 text-ink', numeric && 'tnum pl-4 pr-0 text-right')}>
      {children}
    </td>
  )
}
