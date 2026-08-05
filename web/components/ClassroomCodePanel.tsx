'use client'

import { useEffect, useState } from 'react'
import {
  mintClassroomCode,
  openClassroom,
  readClassroomSession,
  subscribeClassroom,
  type ClassroomSession,
} from '@/lib/classroom-session'
import { cn } from '@/lib/utils'

/**
 * The shoutable code Students type on their phones (#628).
 */
export function ClassroomCodePanel({
  className,
  onOpen,
}: {
  readonly className?: string
  readonly onOpen?: (session: ClassroomSession) => ClassroomSession
}) {
  const [session, setSession] = useState<ClassroomSession | null>(null)

  useEffect(() => {
    setSession(readClassroomSession())
    return subscribeClassroom(setSession)
  }, [])

  const ensure = () => {
    const base =
      session ??
      openClassroom({
        code: mintClassroomCode(),
        lessonId: null,
        lessonLabel: '',
        scenarioId: null,
        scenarioName: '',
        objective: '',
        rules: [],
        limitMinutes: 20,
        zones: [],
        live: false,
      })
    const next = onOpen ? onOpen(base) : base
    setSession(next)
  }

  const awaiting = session?.seats.filter((seat) => seat.phase === 'awaiting-clearance').length ?? 0

  return (
    <section
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-surface border border-hairline bg-surface-1 px-4 py-3',
        className,
      )}
      aria-label="Classroom code for Students"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="label m-0">Student classroom code</h2>
        {session ? (
          <p className="m-0 font-display text-summary font-medium tracking-[0.18em] text-ink">
            {session.code}
          </p>
        ) : (
          <p className="m-0 text-value text-ink-muted">Open a code so phones can join.</p>
        )}
        {session && awaiting > 0 ? (
          <p className="m-0 text-value text-ink-subtle">
            <span className="tnum">{awaiting}</span> awaiting takeoff on Student phones
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {session ? (
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(session.code)
            }}
            className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
          >
            Copy code
          </button>
        ) : null}
        <button
          type="button"
          onClick={ensure}
          className="min-h-11 cursor-pointer rounded-pill border-0 bg-ink px-4 py-1.5 text-value font-medium text-canvas"
        >
          {session ? 'Refresh code panel' : 'Open classroom'}
        </button>
      </div>
    </section>
  )
}
