'use client'

import { useState } from 'react'
import { offsiteBackupOn, setOffsiteBackup } from '@/lib/logbook-sync'
import { groundStationHttpOrigin } from '@/lib/classroom-setup'

/**
 * What a Teacher can do with their records, in two buttons and a box (ADR-0035).
 *
 * **No file path appears anywhere on this panel.** A Teacher presses a button and a dated file
 * lands on their Desktop, which is somewhere they can see. Where `records.db` actually lives is
 * the ground station's business.
 *
 * The box is the off-site backup, and it is **off until somebody ticks it**: no account, no
 * connection, no credential, and until it is ticked nothing has ever been sent. That is the
 * sentence a school is told, so it has to be true on a fresh laptop without anybody checking.
 */
export function MyRecordsPanel() {
  const [offsite, setOffsite] = useState(() => offsiteBackupOn())
  const [saying, setSaying] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  /*
   * The ground station holds the file, so it is the one that can copy it. A board opened
   * without one says so rather than failing silently: a Teacher who pressed a button and saw
   * nothing would reasonably press it again.
   */
  const ask = async (path: string, done: string) => {
    setBusy(true)
    setSaying(null)
    try {
      const origin = groundStationHttpOrigin(window.location)
      const response = await fetch(`${origin}${path}`, { method: 'POST' })
      const body = (await response.json()) as { savedTo?: string; error?: string }
      setSaying(response.ok && body.savedTo ? `${done} ${filenameOf(body.savedTo)}` : (body.error ?? 'That did not work.'))
    } catch {
      setSaying('The ground station is not running. Start it, then try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      className="flex flex-col gap-3 rounded-surface border border-hairline bg-surface-1 p-5"
      aria-labelledby="my-records-heading"
    >
      <div className="flex flex-col gap-1">
        <h2 id="my-records-heading" className="label m-0">
          My records
        </h2>
        <p className="m-0 max-w-[62ch] text-value text-ink-subtle">
          Your class records are kept on this laptop. Nothing is sent anywhere.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void ask('/api/records/copy', 'Saved to your Desktop as')}
          className="min-h-11 cursor-pointer rounded-pill border-0 bg-ink px-4 py-1.5 text-value font-medium text-canvas disabled:opacity-50"
        >
          Save a copy of my records
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void ask('/api/records/csv', 'Saved to your Desktop as')}
          className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink disabled:opacity-50"
        >
          Export for a spreadsheet
        </button>
      </div>

      {saying === null ? null : (
        <p role="status" className="m-0 text-value text-ink">
          {saying}
        </p>
      )}

      <label className="flex max-w-[62ch] items-start gap-3">
        <input
          type="checkbox"
          checked={offsite}
          onChange={(event) => {
            setOffsiteBackup(event.target.checked)
            setOffsite(event.target.checked)
          }}
          className="mt-1 size-5"
        />
        <span className="text-value text-ink">
          Also keep a backup off the premises.
          <span className="block text-ink-subtle">
            Off unless you tick it. Your records stay on this laptop either way.
          </span>
        </span>
      </label>
    </section>
  )
}

/** The name a Teacher will see in their file list, not the path we were handed. */
function filenameOf(path: string): string {
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] ?? path
}
