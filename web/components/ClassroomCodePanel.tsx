'use client'

import { useEffect, useState } from 'react'
import {
  pushClassroomToCloud,
  readClassroomSession,
  subscribeClassroom,
} from '@/lib/classroom-session'

/**
 * The four-character code Students shout across a room — Teacher chrome only.
 *
 * Never put this on the Student surface permanently (ADR-0025).
 */
export function ClassroomCodePanel() {
  const [code, setCode] = useState<string | null>(null)
  const [sync, setSync] = useState<'unknown' | 'ok' | 'skipped' | 'error'>('unknown')

  useEffect(() => {
    const session = readClassroomSession()
    setCode(session?.code ?? null)
    if (session) {
      void pushClassroomToCloud(session).then(setSync)
    }
    return subscribeClassroom((next) => {
      setCode(next?.code ?? null)
      if (next) void pushClassroomToCloud(next).then(setSync)
    })
  }, [])

  if (code === null) {
    return (
      <p className="m-0 text-value text-ink-muted">
        Classroom code appears when a Mission is planned for the period. Pick a Scenario on
        Lesson first.
      </p>
    )
  }

  const syncWords =
    sync === 'ok'
      ? 'Synced for iPads on the school Wi‑Fi.'
      : sync === 'skipped'
        ? 'This laptop only for now. Cloud sync is not configured (need BLOB_READ_WRITE_TOKEN). A second tab here still works.'
        : sync === 'error'
          ? 'Could not reach the classroom cloud. Retry, or use a second tab on this laptop.'
          : 'Checking sync…'

  return (
    <div
      className="flex flex-wrap items-baseline gap-x-4 gap-y-2 rounded-surface border border-hairline bg-canvas px-4 py-3"
      aria-label="Classroom code for Students"
    >
      <div className="flex flex-col gap-1">
        <span className="label">Classroom code</span>
        <p className="tnum m-0 font-display text-heading font-medium tracking-[0.2em]">{code}</p>
      </div>
      <p className="m-0 max-w-[40ch] text-value text-ink-subtle">
        Students open Student on an iPad and join with this code. {syncWords}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
          onClick={() => {
            void navigator.clipboard?.writeText(code)
          }}
        >
          Copy code
        </button>
        <button
          type="button"
          className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
          onClick={() => {
            const session = readClassroomSession()
            if (!session) return
            setSync('unknown')
            void pushClassroomToCloud(session).then(setSync)
          }}
        >
          Retry sync
        </button>
      </div>
    </div>
  )
}
