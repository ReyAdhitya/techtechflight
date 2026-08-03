'use client'

import { useEffect, useState } from 'react'

/** Default Logbook label when the Teacher leaves the name blank at start (E7). */
export const UNTITLED_LESSON_LABEL = 'Untitled lesson'

/** True when closing would still write an Untitled (or empty) name. */
export function needsLessonName(label: string): boolean {
  const trimmed = label.trim()
  return trimmed === '' || trimmed === UNTITLED_LESSON_LABEL
}

/**
 * Confirm the lesson name at close so nothing is left Untitled.
 *
 * Start still allows a blank label (E7). Close does not — a report next term that says
 * Untitled lesson is useless. The Integrator mounts this in the lesson-close dialog
 * before `endLesson` runs.
 */
export function LessonNameConfirm({
  open,
  initialName,
  onConfirm,
  onCancel,
}: {
  readonly open: boolean
  readonly initialName: string
  readonly onConfirm: (name: string) => void
  readonly onCancel: () => void
}) {
  const [name, setName] = useState(initialName)

  useEffect(() => {
    if (open) setName(initialName)
  }, [open, initialName])

  if (!open) return null

  const trimmed = name.trim()
  const canConfirm = !needsLessonName(trimmed)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lesson-name-confirm-title"
    >
      <div className="flex w-full max-w-md flex-col gap-4 rounded-surface border border-hairline bg-canvas p-6">
        <h2
          id="lesson-name-confirm-title"
          className="m-0 font-display text-summary font-medium text-ink"
        >
          Name this lesson
        </h2>
        <p className="m-0 text-body text-ink-subtle">
          Closing needs a name so the record is not left as Untitled lesson.
        </p>
        <label className="flex flex-col gap-1" htmlFor="lesson-name-confirm-input">
          <span className="label">Lesson name</span>
          <input
            id="lesson-name-confirm-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Year 8, period 3"
            className="min-h-11 rounded-pill border border-hairline bg-surface-1 px-4 py-1.5 text-value text-ink"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter' && canConfirm) onConfirm(trimmed)
              if (event.key === 'Escape') onCancel()
            }}
          />
        </label>
        {!canConfirm && (
          <p className="m-0 text-value text-ink-muted" role="status">
            Enter a name to close — Untitled is not enough.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canConfirm}
            className="min-h-11 rounded-pill border-0 bg-ink px-4 py-1.5 text-caption font-medium text-canvas disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => {
              if (canConfirm) onConfirm(trimmed)
            }}
          >
            Confirm and close
          </button>
          <button
            type="button"
            className="min-h-11 rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-caption text-ink"
            onClick={onCancel}
          >
            Keep lesson open
          </button>
        </div>
      </div>
    </div>
  )
}
