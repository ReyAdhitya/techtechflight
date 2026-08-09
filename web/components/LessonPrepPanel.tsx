'use client'

import { useState } from 'react'
import type { DroneState } from '@techtechflight/contract'
import {
  applyLessonAssignments,
  assignStudentToLessonDrone,
  attachDroneToLesson,
  clearLessonDroneAssignment,
  createTrainerLesson,
  detachDroneFromLesson,
  type Logbook,
} from '@/lib/logbook'

/**
 * Minimal prepared-Lesson editor: attach Fleet Drones and assign Student→Drone.
 *
 * Teachers name a Lesson only — the board assigns `L-…` (#58). Drones are picked from the
 * Fleet by existing id, never typed as a second key. Does not redesign Control. Empty
 * application is a no-op so ad-hoc starts stay free (E7).
 *
 * **The name comes from above.** This panel used to carry its own *Lesson name* box, sitting
 * on the same screen as *What is this lesson?* over the Start button: one question, two boxes,
 * and no way for a Teacher to tell which one the Lesson would end up called. The set-up area
 * asks once and both this and Start read the answer.
 */
export function LessonPrepPanel({
  drones,
  book,
  lessonName = '',
  onPlanSaved,
}: {
  readonly drones: readonly DroneState[]
  readonly book: Logbook
  /** What the Teacher typed in the one Lesson name field. */
  readonly lessonName?: string
  readonly onPlanSaved?: (lessonId: string) => void
}) {
  const [selectedId, setSelectedId] = useState(book.trainerLessons[0]?.lessonId ?? '')
  const named = lessonName.trim() !== ''

  const activeId = selectedId || book.trainerLessons[0]?.lessonId || ''
  const attached = new Set(
    book.lessonDrones.filter((row) => row.lessonId === activeId).map((row) => row.droneId),
  )
  const assignmentByDrone = new Map(
    book.lessonAssignments
      .filter((row) => row.lessonId === activeId)
      .map((row) => [row.droneId, row.studentId]),
  )

  return (
    <section className="flex flex-col gap-4 rounded-surface border border-hairline bg-surface-1 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="label m-0">Lesson plan</h2>
        <p className="m-0 text-value text-ink-subtle">
          Prepare which craft are in a Lesson and who flies them. Name the plan. The board
          assigns its ID. The same Fleet can serve many periods. Membership is per Lesson,
          not permanent.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!named}
          onClick={() => {
            const id = createTrainerLesson(lessonName)
            if (!id) return
            setSelectedId(id)
            onPlanSaved?.(id)
          }}
          className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink disabled:cursor-not-allowed disabled:text-ink-muted disabled:hover:border-hairline"
        >
          Save plan
        </button>
        <p className="m-0 text-value text-ink-muted">
          {named ? `Saves as ${lessonName.trim()}.` : 'Name the Lesson above to save a plan.'}
        </p>
      </div>

      {book.trainerLessons.length > 0 && (
        <label className="flex flex-col gap-1">
          <span className="label">Working on</span>
          <select
            value={activeId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="min-h-11 max-w-md rounded-pill border border-hairline bg-canvas px-3 py-1 text-value text-ink"
          >
            {book.trainerLessons.map((lesson) => (
              <option key={lesson.lessonId} value={lesson.lessonId}>
                {lesson.lessonName} ({lesson.lessonId})
              </option>
            ))}
          </select>
        </label>
      )}

      {activeId !== '' && (
        <>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {drones.map((drone) => {
              const isIn = attached.has(drone.id)
              const assignedId = assignmentByDrone.get(drone.id) ?? ''
              return (
                <li
                  key={drone.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-hairline pt-2 first:border-t-0 first:pt-0"
                >
                  <span className="w-24 font-display text-value font-medium text-ink">
                    {drone.name}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      isIn
                        ? detachDroneFromLesson(activeId, drone.id)
                        : attachDroneToLesson(activeId, drone.id)
                    }
                    className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-3 py-1.5 text-value text-ink hover:border-ink"
                  >
                    {isIn ? 'In this Lesson' : 'Add to Lesson'}
                  </button>
                  {isIn && (
                    <label className="flex items-center gap-2">
                      <span className="visually-hidden">Student for {drone.name}</span>
                      <select
                        value={assignedId}
                        onChange={(event) => {
                          const next = event.target.value
                          if (next === '') clearLessonDroneAssignment(activeId, drone.id)
                          else assignStudentToLessonDrone(activeId, drone.id, next)
                        }}
                        className="min-h-11 rounded-pill border border-hairline bg-canvas px-3 py-1 text-value text-ink"
                      >
                        <option value="">No Student</option>
                        {book.roster.map((student) => (
                          <option key={student.studentId} value={student.studentId}>
                            {student.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </li>
              )
            })}
          </ul>

          <button
            type="button"
            onClick={() => applyLessonAssignments(activeId)}
            className="min-h-11 w-fit cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
          >
            Apply assignments to the board
          </button>
        </>
      )}
    </section>
  )
}
