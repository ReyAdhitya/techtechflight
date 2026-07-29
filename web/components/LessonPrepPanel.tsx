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
 * Minimal prepared-Lesson editor: name a plan, attach Fleet Drones, assign Student→Drone.
 *
 * Teachers type a **Lesson name** only — the board assigns `L-…` (#58). Drones are picked
 * from the Fleet by existing id, never typed as a second key. Does not redesign Control.
 * Empty application is a no-op so ad-hoc starts stay free (E7).
 */
export function LessonPrepPanel({
  drones,
  book,
}: {
  readonly drones: readonly DroneState[]
  readonly book: Logbook
}) {
  const [lessonName, setLessonName] = useState('')
  const [selectedId, setSelectedId] = useState(book.trainerLessons[0]?.lessonId ?? '')

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
          Prepare which craft are in a Lesson and who flies them. Name the plan — the board
          assigns its ID. The same Fleet can serve many periods — membership is per Lesson,
          not permanent.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="label">Lesson name</span>
          <input
            value={lessonName}
            onChange={(event) => setLessonName(event.target.value)}
            className="min-h-11 w-48 rounded-pill border border-hairline bg-canvas px-3 py-1 text-value text-ink"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            const id = createTrainerLesson(lessonName)
            if (id) {
              setSelectedId(id)
              setLessonName('')
            }
          }}
          className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
        >
          Save plan
        </button>
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
