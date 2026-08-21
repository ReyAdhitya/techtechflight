'use client'

import { useEffect, useState } from 'react'
import {
  readClassroomSession,
  reportClassroomSync,
  subscribeClassroom,
  type ClassroomSyncReport,
} from '@/lib/classroom-session'

/**
 * The four-character code Students shout across a room — Teacher chrome only.
 *
 * Never put this on the Student surface permanently (ADR-0025).
 */
export function ClassroomCodePanel() {
  const [code, setCode] = useState<string | null>(null)
  const [sync, setSync] = useState<ClassroomSyncReport | null>(null)

  useEffect(() => {
    const session = readClassroomSession()
    setCode(session?.code ?? null)
    if (session) {
      void reportClassroomSync(session).then(setSync)
    }
    return subscribeClassroom((next) => {
      setCode(next?.code ?? null)
      if (next) void reportClassroomSync(next).then(setSync)
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
        Students open Student on an iPad and join with this code.
      </p>
      <SyncWords report={sync} />
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
            setSync(null)
            void reportClassroomSync(session).then(setSync)
          }}
        >
          Retry sync
        </button>
      </div>
    </div>
  )
}

/**
 * Which store, and what it said.
 *
 * Two lies lived here. It named `BLOB_READ_WRITE_TOKEN`, an environment variable that stopped
 * meaning anything on 2026-08-12 when the store moved to Cloudflare, so a Teacher chasing the
 * sentence was chasing a setting nobody has. And it said "not configured" when it meant "the
 * store refused me", which are different problems with different people to call, and telling
 * them apart is what would have caught a broken sync in a morning instead of three days.
 */
function SyncWords({ report }: { readonly report: ClassroomSyncReport | null }) {
  if (report === null) {
    return <p className="m-0 text-value text-ink-muted">Checking sync…</p>
  }

  if (report.state === 'ok') {
    return (
      <p className="m-0 text-value text-ink-subtle">
        Synced. iPads on this network can join with the code.
      </p>
    )
  }

  if (report.state === 'unconfigured') {
    return (
      <p role="status" className="m-0 max-w-[46ch] text-value text-ink">
        This laptop only. No classroom store is set up at {report.store}. A second tab here
        still works.
      </p>
    )
  }

  return (
    <p
      role="status"
      className="m-0 max-w-[46ch] border-l-4 border-status-not-ready pl-3 text-value text-ink"
    >
      iPads cannot join. {report.state === 'offline' ? 'Nothing answered at ' : 'Refused by '}
      {report.store}
      {report.status === null ? '' : <> (<span className="tnum">{report.status}</span>)</>}
      {report.detail === '' ? '' : `: ${report.detail}`}. A second tab on this laptop still
      works.
    </p>
  )
}
