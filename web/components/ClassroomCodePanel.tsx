'use client'

import { useEffect, useState } from 'react'
import {
  pushClassroomToCloud,
  readClassroomSession,
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
            void pushClassroomToCloud(session).then(setSync)
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
 * "Could not reach the classroom cloud" was on this panel for three days while three Vercel
 * Blob stores sat suspended for unpaid billing. Every word of it was true and none of it was
 * actionable: it did not say which cloud, and it did not say that the cloud had answered — a
 * 500 with a reason in it reads, to a Teacher, exactly like a school firewall.
 *
 * So: name the store, print the status, and quote what it said. A Teacher forwards that to
 * whoever runs the account, and meanwhile the second tab on this laptop still works, which is
 * the one line that was worth keeping.
 */
function SyncWords({ report }: { readonly report: ClassroomSyncReport | null }) {
  if (report === null) {
    return <p className="m-0 text-value text-ink-muted">Checking sync…</p>
  }

  if (report.state === 'ok') {
    return (
      <p className="m-0 text-value text-ink-subtle">Synced for iPads on the school Wi‑Fi.</p>
    )
  }

  const storeName =
    report.store === 'worker' ? 'the Cloudflare classroom store' : 'the Vercel classroom store'

  if (report.state === 'unconfigured') {
    return (
      <p role="status" className="m-0 max-w-[46ch] text-value text-ink">
        This laptop only. No classroom store is set up
        {report.store === 'worker'
          ? ' at the address the board was given'
          : ' (NEXT_PUBLIC_CLASSROOM_SYNC_URL is unset and Vercel Blob has no token)'}
        . A second tab here still works.
      </p>
    )
  }

  return (
    <p
      role="status"
      className="m-0 max-w-[46ch] border-l-4 border-status-not-ready pl-3 text-value text-ink"
    >
      iPads cannot join. {storeName} answered{' '}
      {report.status === null ? 'nothing at all' : <span className="tnum">{report.status}</span>}
      {report.detail === '' ? '' : `: ${report.detail}`}. A second tab on this laptop still
      works. Send this line to whoever runs the account.
    </p>
  )
}
