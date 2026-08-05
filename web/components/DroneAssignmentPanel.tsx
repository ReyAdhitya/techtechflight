'use client'

import { useState } from 'react'
import type { DroneState } from '@techtechflight/contract'
import { isStudentAbsent, studentOf, type Logbook } from '@/lib/logbook'
import {
  canUndoAssignment,
  undoLastAssignment,
  withAssignmentUndo,
} from '@/lib/assignment-undo'
import { markAbsentAndFreeCraft, type AbsentReassignResult } from '@/lib/absent-reassign'
import { AbsentReassignNotice } from './AbsentReassignNotice'
import { AssignEveryoneButton } from './AssignEveryoneButton'
import { AssignmentColumn } from './AssignmentColumn'
import { AssignmentUndoButton } from './AssignmentUndoButton'
import { SwapPupilsControl } from './SwapPupilsControl'
import { WaitingList } from './WaitingList'

/**
 * Who is flying what, and who is not here today.
 *
 * Lifted out of the Lesson screen unchanged. It sat there because Lesson was the first
 * screen to need it, and it stayed after Students arrived, so a Teacher had two rosters:
 * one on the screen the navigation calls "The class, and Drone assignment", and one under
 * the Mission set-up on a screen about the period.
 */
export function DroneAssignmentPanel({
  drones,
  book,
}: {
  readonly drones: readonly DroneState[]
  readonly book: Logbook
}) {
  const [absentNotice, setAbsentNotice] = useState<AbsentReassignResult | null>(null)
  // Assignment is written straight to the Logbook, so a bump is what re-reads it.
  const [undoTick, setUndoTick] = useState(0)
  void undoTick

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <AssignEveryoneButton droneIds={drones.map((drone) => drone.id)} />
        <AssignmentUndoButton
          canUndo={canUndoAssignment()}
          onUndo={() => {
            undoLastAssignment()
            setUndoTick((n) => n + 1)
          }}
        />
      </div>

      <SwapPupilsControl
        options={drones.map((drone) => ({
          droneId: drone.id,
          droneName: drone.name,
          studentName: studentOf(book, drone.id),
        }))}
        onSwapped={() => setUndoTick((n) => n + 1)}
      />

      <AssignmentColumn drones={drones} book={book} />
      <WaitingList book={book} />

      {book.roster.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="label m-0">Mark absent</h2>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {book.roster.map((student) =>
              student.studentId === '' || isStudentAbsent(book, student.studentId) ? null : (
                <li key={student.studentId}>
                  <button
                    type="button"
                    onClick={() => {
                      withAssignmentUndo(() => {
                        setAbsentNotice(markAbsentAndFreeCraft(student.studentId))
                      })
                      setUndoTick((n) => n + 1)
                    }}
                    className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
                  >
                    {student.name} absent
                  </button>
                </li>
              ),
            )}
          </ul>
          <AbsentReassignNotice
            result={absentNotice}
            droneNames={Object.fromEntries(drones.map((d) => [d.id, d.name]))}
          />
        </div>
      )}
    </div>
  )
}
