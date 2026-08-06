'use client'

import { useEffect, useState } from 'react'
import { readClassroomSession, subscribeClassroom } from '@/lib/classroom-session'

/**
 * The four-character code Students shout across the room — Teacher chrome only.
 *
 * Never put this on the Student surface permanently (ADR-0025). It is how an iPad joins
 * once `/api/classroom` answers; until then two tabs on this laptop still share the session.
 */
export function ClassroomCodePanel() {
  const [code, setCode] = useState<string | null>(null)

  useEffect(() => {
    setCode(readClassroomSession()?.code ?? null)
    return subscribeClassroom((session) => setCode(session?.code ?? null))
  }, [])

  if (code === null) {
    return (
      <p className="m-0 text-value text-ink-muted">
        Classroom code appears when a Mission is open for the period.
      </p>
    )
  }

  return (
    <div
      className="flex flex-wrap items-baseline gap-x-4 gap-y-2 rounded-surface border border-hairline bg-canvas px-4 py-3"
      aria-label="Classroom code for Students"
    >
      <div className="flex flex-col gap-1">
        <span className="label">Classroom code</span>
        <p className="tnum m-0 font-display text-heading font-medium tracking-[0.2em]">{code}</p>
      </div>
      <p className="m-0 max-w-[36ch] text-value text-ink-subtle">
        Students open the Student door on an iPad and join with this code.
      </p>
      <button
        type="button"
        className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
        onClick={() => {
          void navigator.clipboard?.writeText(code)
        }}
      >
        Copy code
      </button>
    </div>
  )
}
