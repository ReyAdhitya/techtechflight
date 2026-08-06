'use client'

import { useState } from 'react'
import { addLessonBookmark, type LessonBookmark } from '@/lib/logbook'
import { formatClock } from '@/lib/telemetry-presentation'
import { formatElapsed } from './LessonStrip'

/**
 * Bookmark a moment during a running lesson — elapsed time plus an optional note.
 *
 * Writes to the Logbook only; nothing is sent to the Fleet (ADR-0011).
 */
export function LessonBookmarkControl({
  lessonId,
  startedAt,
  now,
  bookmarks,
  compact = false,
}: {
  readonly lessonId: string
  readonly startedAt: number
  readonly now: number
  readonly bookmarks: readonly LessonBookmark[]
  /** Strip chrome: one row of controls, no recent-list under the button. */
  readonly compact?: boolean
}) {
  const [note, setNote] = useState('')
  const [draftOpen, setDraftOpen] = useState(false)

  const save = () => {
    addLessonBookmark(lessonId, now || Date.now(), note)
    setNote('')
    setDraftOpen(false)
  }

  return (
    <div className={compact ? 'contents' : 'flex flex-col gap-2'}>
      <div className="flex flex-wrap items-center gap-2">
        {!draftOpen ? (
          <button
            type="button"
            onClick={() => setDraftOpen(true)}
            className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
          >
            Bookmark moment
          </button>
        ) : (
          <>
            <label className="flex min-w-[12rem] flex-1 flex-col gap-1">
              <span className="visually-hidden">Note for this bookmark</span>
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional note"
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
              Save bookmark
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

      {!compact && bookmarks.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {[...bookmarks].reverse().slice(0, 5).map((bookmark) => (
            <li key={bookmark.at} className="tnum text-value text-ink-subtle">
              {formatElapsed(Math.max(0, bookmark.at - startedAt))} ·{' '}
              {bookmark.note ?? formatClock(bookmark.at)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
