'use client'

import { useState } from 'react'
import type { Exercise } from '@/lib/logbook'

/**
 * What the Lesson runs through, in order.
 *
 * An Exercise is the thing no Telemetry can report: what a Student is *meant* to be doing.
 * The Flight Control Center shows it beside what the Drone is actually doing and lets the
 * Teacher make the comparison — nothing here tries to make it automatically, because that
 * needs an Exercise to declare an expected flight phase and none of them do (B7, dropped).
 *
 * Reordered with buttons rather than by dragging, for the same reasons the assignment
 * column is typed rather than dragged: touch, keyboards, and standing up.
 */
export function ExerciseList({
  exercises,
  onChange,
}: {
  readonly exercises: readonly Exercise[]
  readonly onChange: (next: readonly Exercise[]) => void
}) {
  const [name, setName] = useState('')
  const [minutes, setMinutes] = useState('')

  const add = () => {
    const trimmed = name.trim()
    if (trimmed === '') return
    const parsed = Number(minutes)
    onChange([
      ...exercises,
      {
        id: `exercise-${exercises.length}-${trimmed.toLowerCase().replace(/\s+/g, '-')}`,
        name: trimmed,
        // Optional throughout. An Exercise with no intended duration is normal, not
        // half-finished, so an unparseable or empty box simply means "no time given".
        ...(Number.isFinite(parsed) && parsed > 0 ? { minutes: parsed } : {}),
      },
    ])
    setName('')
    setMinutes('')
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= exercises.length) return
    const next = [...exercises]
    const [moved] = next.splice(from, 1)
    if (moved) next.splice(to, 0, moved)
    onChange(next)
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="label m-0">Exercises</h2>

      {exercises.length === 0 ? (
        <p className="m-0 text-value text-ink-subtle">
          None recorded. A Lesson runs without them; these are for when the board is to
          show what each Student is meant to be doing.
        </p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {exercises.map((exercise, index) => (
            <li key={exercise.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="tnum w-6 text-value text-ink-muted">{index + 1}.</span>
              <span className="text-value text-ink">{exercise.name}</span>
              {exercise.minutes !== undefined && (
                <span className="tnum text-value text-ink-subtle">{exercise.minutes} min</span>
              )}
              <span className="ml-auto flex gap-1">
                <button
                  type="button"
                  aria-label={`Move ${exercise.name} earlier`}
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                  className="min-h-11 min-w-11 cursor-pointer rounded-pill border border-hairline bg-transparent text-value text-ink hover:border-ink disabled:cursor-default disabled:text-ink-muted"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move ${exercise.name} later`}
                  disabled={index === exercises.length - 1}
                  onClick={() => move(index, index + 1)}
                  className="min-h-11 min-w-11 cursor-pointer rounded-pill border border-hairline bg-transparent text-value text-ink hover:border-ink disabled:cursor-default disabled:text-ink-muted"
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${exercise.name}`}
                  onClick={() => onChange(exercises.filter((_, at) => at !== index))}
                  className="min-h-11 min-w-11 cursor-pointer rounded-pill border border-hairline bg-transparent text-value text-ink-muted hover:border-ink hover:text-ink"
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="label">Add an exercise</span>
          <input
            value={name}
            placeholder="Stay still in the air"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                add()
              }
            }}
            className="min-h-11 w-48 rounded-pill border border-hairline bg-canvas px-3 py-1 text-value text-ink"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Minutes</span>
          <input
            value={minutes}
            inputMode="numeric"
            placeholder="-"
            onChange={(event) => setMinutes(event.target.value)}
            className="tnum min-h-11 w-20 rounded-pill border border-hairline bg-canvas px-3 py-1 text-value text-ink"
          />
        </label>
        <button
          type="button"
          onClick={add}
          className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
        >
          Add
        </button>
      </div>
    </section>
  )
}
