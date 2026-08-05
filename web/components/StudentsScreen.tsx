'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import {
  absentStudentsNotFlying,
  assignNextRosterName,
  clearStudents,
  firstUnassignedDrone,
  isStudentAbsent,
  nextRosterNameForAssign,
  readLogbook,
  readServerLogbook,
  registerStudent,
  removeStudent,
  setStudentAbsent,
  studentOf,
  subscribeLogbook,
} from '@/lib/logbook'
import {
  attendanceCountsFor,
  readAttendanceHistory,
  readServerAttendanceHistory,
  subscribeAttendanceHistory,
} from '@/lib/attendance-history'
import {
  pupilNoteOf,
  readPupilNotes,
  readServerPupilNotes,
  subscribePupilNotes,
} from '@/lib/pupil-notes'
import { pupilAirborneMs } from '@/lib/pupil-flight-hours'
import { STATUS_PRESENTATION } from '@/lib/status-presentation'
import { cn } from '@/lib/utils'
import { AssignNextButton } from './AssignNextButton'
import { DroneAssignmentPanel } from './DroneAssignmentPanel'
import { AttendanceHistory } from './AttendanceHistory'
import { PupilFlightHours } from './PupilFlightHours'
import { PupilNotesField } from './PupilNotesField'
import { RosterCsvImport } from './RosterCsvImport'
import { useFleet } from './FleetProvider'
import { LogbookLocationNote } from './LogbookLocationNote'
import { PresenceBadge } from './PresenceBadge'
import { StatusGlyph } from './StatusBadge'
import { READING_FRAME } from '@/lib/frame'

/**
 * The class, and who is flying what.
 *
 * **This screen records Drones, never children.** A Student is shown which Drone they have
 * and which Lessons they have flown in, and nothing else — no incidents, no faults, no
 * accumulating history against a named child.
 *
 * The reason is both factual and ethical. A Drone that faulted did not fault because of
 * whose hands were on the controller, so a record implying otherwise is simply wrong. And
 * a system that quietly builds a failure history against a named child in a school is not
 * something to construct as a side effect of adding an assignment feature. If it is ever
 * wanted it is a deliberate decision with a safeguarding conversation attached.
 *
 * Teachers type a **name** only. The board assigns `S-…` (#58).
 */
export function StudentsScreen() {
  const { snapshot } = useFleet()
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)
  const attendance = useSyncExternalStore(
    subscribeAttendanceHistory,
    readAttendanceHistory,
    readServerAttendanceHistory,
  )
  const notes = useSyncExternalStore(subscribePupilNotes, readPupilNotes, readServerPupilNotes)
  const drones = snapshot.state?.drones ?? []
  const [name, setName] = useState('')

  const flying = drones.filter((drone) => studentOf(book, drone.id) !== null)
  const absentNotFlying = absentStudentsNotFlying(book)
  const roster = book.roster.length > 0
    ? book.roster
    : book.roll.map((rollName) => ({ studentId: '', name: rollName }))
  const boardDroneIds = drones.map((drone) => drone.id)
  const nextRosterName = nextRosterNameForAssign(book)
  const assignTargetDroneId = firstUnassignedDrone(book, boardDroneIds)

  const addStudent = () => {
    registerStudent(name)
    setName('')
  }

  return (
    <main
      id="content"
      tabIndex={-1}
      className={cn(READING_FRAME, 'flex flex-col gap-8 p-4 min-[26rem]:p-8')}
    >
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-summary font-medium">Students</h1>
        <LogbookLocationNote />
      </div>

      {/*
       * Who is flying what. It lived on Lesson, under the Mission set-up, on a screen about
       * the period rather than about the class. This is the screen the navigation names.
       */}
      <section className="flex flex-col gap-3">
        <h2 className="label m-0">Drone assignment</h2>
        <DroneAssignmentPanel drones={snapshot.state?.drones ?? []} book={book} />
      </section>

      <RosterCsvImport />

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="label m-0">Flying now</h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <AssignNextButton
              nextName={nextRosterName}
              targetDroneId={assignTargetDroneId}
              onAssign={() => {
                if (assignTargetDroneId) assignNextRosterName(assignTargetDroneId)
              }}
            />
            {flying.length > 0 && (
            <button
              type="button"
              onClick={clearStudents}
              className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted hover:border-ink hover:text-ink"
            >
              Everyone has put theirs down
            </button>
            )}
          </div>
        </div>

        {flying.length === 0 ? (
          <p className="m-0 text-value text-ink-subtle">
            No Drone is assigned. Assignments are made on the Lesson screen.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {flying.map((drone) => (
              <li
                key={drone.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-surface border border-hairline bg-surface-1 p-3"
              >
                <span className="font-display text-body font-medium text-ink">
                  {studentOf(book, drone.id)}
                </span>
                <Link
                  prefetch={false}
                  href={`/drone?id=${encodeURIComponent(drone.id)}`}
                  className="text-value text-ink no-underline hover:underline"
                >
                  {drone.name}
                </Link>
                {drone.status === 'Offline' ? (
                  <PresenceBadge kind="offline" />
                ) : (
                  <span
                    className={cn(
                      'inline-flex items-center gap-2 text-value',
                      drone.status === 'Fault'
                        ? 'text-status-fault'
                        : drone.status === 'Not Ready'
                          ? 'text-status-not-ready'
                          : 'text-ink-subtle',
                    )}
                  >
                    <StatusGlyph shape={STATUS_PRESENTATION[drone.status].shape} />
                    {STATUS_PRESENTATION[drone.status].label}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {absentNotFlying.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="label m-0">Absent today</h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {absentNotFlying.map((student) => (
              <li
                key={student.studentId}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-surface border border-hairline bg-surface-1 px-3 py-2"
              >
                <span className="font-display text-body font-medium text-ink">{student.name}</span>
                <PresenceBadge kind="absent" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3 border-t border-hairline pt-6">
        <div className="flex flex-col gap-1">
          <h2 className="label m-0">The class</h2>
          <p className="m-0 text-value text-ink-subtle">
            Type a name — the board assigns an ID for records. Strips and Alerts still show
            the name. Notes and attendance stay on this laptop.
          </p>
        </div>

        {roster.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {roster.map((student) => {
              const counts = student.studentId
                ? attendanceCountsFor(attendance, student.studentId)
                : { present: 0, absent: 0 }
              const noteText =
                student.studentId !== ''
                  ? (pupilNoteOf(notes, student.studentId)?.text ?? '')
                  : ''
              const hours =
                student.studentId !== ''
                  ? pupilAirborneMs(book, student.studentId)
                  : { studentKey: student.name, airborneMs: 0, lessonCount: 0 }

              return (
                <li
                  key={student.studentId || student.name}
                  className="flex flex-col gap-3 rounded-surface border border-hairline bg-surface-1 px-3 py-3"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-display text-body font-medium text-ink">
                      {student.name}
                    </span>
                    {student.studentId !== '' && isStudentAbsent(book, student.studentId) && (
                      <PresenceBadge kind="absent" />
                    )}
                    {student.studentId !== '' && (
                      <span className="tnum text-value text-ink-subtle">{student.studentId}</span>
                    )}
                    {student.studentId !== '' && (
                      <button
                        type="button"
                        onClick={() =>
                          setStudentAbsent(
                            student.studentId,
                            !isStudentAbsent(book, student.studentId),
                          )
                        }
                        className="cursor-pointer border-0 bg-transparent text-value text-ink-muted hover:text-ink"
                      >
                        {isStudentAbsent(book, student.studentId) ? 'Mark present' : 'Mark absent'}
                      </button>
                    )}
                    {student.studentId !== '' && (
                      <button
                        type="button"
                        aria-label={`Remove ${student.name} from the class`}
                        onClick={() => removeStudent(student.studentId)}
                        className="ml-auto cursor-pointer border-0 bg-transparent text-value text-ink-muted hover:text-ink"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  {student.studentId !== '' && (
                    <div className="grid gap-3 min-[40rem]:grid-cols-2">
                      <AttendanceHistory studentName={student.name} counts={counts} />
                      <PupilFlightHours studentName={student.name} hours={hours} />
                    </div>
                  )}
                  {student.studentId !== '' && (
                    <PupilNotesField
                      studentId={student.studentId}
                      studentName={student.name}
                      text={noteText}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="label">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                addStudent()
              }}
              className="min-h-11 w-48 rounded-pill border border-hairline bg-canvas px-3 py-1 text-value text-ink"
            />
          </label>
          <button
            type="button"
            onClick={addStudent}
            className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
          >
            Add
          </button>
        </div>
      </section>
    </main>
  )
}
