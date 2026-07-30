'use client'

import { useState } from 'react'
import {
  logbookSyncUrl,
  readLogbookSyncSecret,
  writeLogbookSyncSecret,
} from '@/lib/logbook-sync'

/**
 * Shared secret so the public Vercel URL cannot read pupil names without it (#93).
 */
export function LogbookSyncPanel() {
  const [secret, setSecret] = useState(() => readLogbookSyncSecret() ?? '')
  const [saved, setSaved] = useState(false)

  return (
    <section className="flex flex-col gap-3 rounded-surface border border-hairline bg-surface-1 p-5">
      <h2 className="label m-0">Cloud Logbook copy</h2>
      <p className="m-0 text-value text-ink-subtle">
        Saves stay on this laptop first. When online, a copy can sync to Vercel at{' '}
        <span className="text-ink">{logbookSyncUrl()}</span> so the online board shows the
        same Students and Reports. Use the same shared secret on Vercel (
        <span className="text-ink">LOGBOOK_SYNC_SECRET</span>) and here. Pupil names are in
        that copy — do not post the secret.
      </p>
      <label className="flex flex-col gap-1">
        <span className="label">Sync secret</span>
        <input
          type="password"
          autoComplete="off"
          value={secret}
          onChange={(event) => {
            setSecret(event.target.value)
            setSaved(false)
          }}
          className="min-h-11 rounded-pill border border-hairline bg-canvas px-4 text-value text-ink"
        />
      </label>
      <button
        type="button"
        className="min-h-11 w-fit cursor-pointer rounded-pill border-0 bg-ink px-4 text-value font-medium text-canvas"
        onClick={() => {
          writeLogbookSyncSecret(secret)
          setSaved(true)
        }}
      >
        Save secret
      </button>
      {saved ? (
        <p className="m-0 text-value text-ink-muted">Saved on this browser. Next Logbook writes will sync when online.</p>
      ) : null}
    </section>
  )
}
