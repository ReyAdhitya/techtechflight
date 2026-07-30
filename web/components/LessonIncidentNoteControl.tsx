'use client'

import { useState } from 'react'
import type { DroneId } from '@techtechflight/contract'
import { addTeacherIncidentNote, type LessonIncident } from '@/lib/logbook'
import { formatClock } from '@/lib/telemetry-presentation'
import { formatElapsed } from './LessonStrip'

/**
 * Record what the Teacher saw — written to the Logbook, not sent to the Fleet (ADR-0011).
 */
export function LessonIncidentNoteControl({
  lessonId,
  startedAt,
  now,
  incidents,
  droneId,
  droneName,
}: {
  readonly lessonId: string
  readonly startedAt: number
  readonly now: number
  readonly incidents: readonly LessonIncident[]
  readonly droneId?: DroneId
  readonly droneName?: string
}) {
  const [note, setNote] = useState('')
  const [draftOpen, setDraftOpen] = useState(false)
  const teacherNotes = incidents.filter((incident) => incident.severity === 'attention')

  const save = () => {
    addTeacherIncidentNote(lessonId, now || Date.now(), note, {
      ...(droneId !== undefined ? { droneId } : {}),
      ...(droneName !== undefined ? { droneName } : {}),
    })
    setNote('')
    setDraftOpen(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {!draftOpen ? (
          <button
            type="button"
            onClick={() => setDraftOpen(true)}
            className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
          >
            Note incident
          </button>
        ) : (
          <>
            <label className="flex min-w-[12rem] flex-1 flex-col gap-1">
              <span className="visually-hidden">What happened</span>
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="What you saw"
                className="min-h-11 rounded-pill border border-hairline bg-canvas px-4 py-1.5 text-value text-ink"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') save()
                  if (event.key === 'Escape') setDraftOpen(false)
                }}
              />
            </label>
            <button
              type="button"
              onClick={save}
              className="min-h-11 cursor-pointer rounded-pill border-0 bg-ink px-4 py-1.5 text-value font-medium text-canvas"
            >
              Save note
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftOpen(false)
                setNote('')
              }}
              className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted hover:border-ink hover:text-ink"
            >
              Cancel
            </button>
          </>
        )}
      </div>

      {teacherNotes.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {[...teacherNotes].reverse().slice(0, 5).map((incident) => (
            <li key={incident.at} className="tnum text-value text-ink-subtle">
              {formatElapsed(Math.max(0, incident.at - startedAt))} — {incident.text}
              {incident.droneName ? ` (${incident.droneName})` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
