'use client'

import { useState } from 'react'
import { writePupilNote } from '@/lib/pupil-notes'

/**
 * Free-text note for one Student — same save-on-blur habit as craft notes (#342 / F223).
 *
 * Integrator mounts beside a roster row on StudentsScreen with the current text from
 * `pupilNoteOf(readPupilNotes(), studentId)?.text ?? ''`.
 */
export function PupilNotesField({
  studentId,
  studentName,
  text,
}: {
  readonly studentId: string
  readonly studentName: string
  readonly text: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? text
  const fieldId = `pupil-note-${studentId}`

  return (
    <section className="flex flex-col gap-2">
      <label className="label" htmlFor={fieldId}>
        Note
      </label>
      <textarea
        id={fieldId}
        value={value}
        rows={3}
        placeholder={`Notes about ${studentName} — warm-up needs, landing confidence…`}
        aria-label={`Note for ${studentName}`}
        className="rounded-surface border border-hairline bg-surface-1 p-3 text-value text-ink"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft !== null) writePupilNote(studentId, draft, Date.now())
          setDraft(null)
        }}
      />
      <p className="m-0 text-value text-ink-subtle">Saved when focus leaves the field.</p>
    </section>
  )
}
