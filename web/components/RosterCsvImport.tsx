'use client'

import { useRef, useState } from 'react'
import { applyRosterCsv, type RosterCsvResult } from '@/lib/roster-csv'

function readFileAsText(file: File): Promise<string> {
  // Prefer `.text()` when present; fall back to FileReader for older / test hosts.
  if (typeof file.text === 'function') {
    return file.text()
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsText(file)
  })
}

/**
 * Import a class list from CSV — validates before writing (#345 / F226).
 *
 * Malformed files leave the Logbook alone and say why. Integrator mounts on
 * StudentsScreen beside the Add control. Paste is offered as well as file
 * choose — school laptops often get the list from a message, not a download.
 */
export function RosterCsvImport({
  onApplied,
}: {
  readonly onApplied?: (result: Extract<RosterCsvResult, { ok: true }>) => void
} = {}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [paste, setPaste] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  function applyText(text: string) {
    const result = applyRosterCsv(text)
    if (!result.ok) {
      setFailed(true)
      setMessage(result.reason)
      return
    }
    setFailed(false)
    setMessage(`Imported ${result.rows.length} Students from the file.`)
    setPaste('')
    onApplied?.(result)
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    setMessage(null)
    setFailed(false)
    try {
      applyText(await readFileAsText(file))
    } catch {
      setFailed(true)
      setMessage('That file could not be read as text.')
    }
  }

  return (
    <section className="flex flex-col gap-2" aria-label="Roster CSV import">
      <h3 className="label m-0">Import class list</h3>
      <p className="m-0 text-value text-ink-subtle">
        CSV with a Name column — or one name per line. A bad file changes nothing and
        says why.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv,text/plain"
        className="sr-only"
        aria-label="Choose roster CSV file"
        onChange={(event) => {
          const file = event.target.files?.[0]
          void onFile(file)
          event.target.value = ''
        }}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="min-h-11 w-fit cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
          onClick={() => inputRef.current?.click()}
        >
          Choose CSV
        </button>
      </div>
      <label className="flex flex-col gap-1">
        <span className="label">Or paste</span>
        <textarea
          value={paste}
          rows={4}
          placeholder={'name\nAmara\nPriya'}
          aria-label="Paste roster CSV"
          className="rounded-surface border border-hairline bg-surface-1 p-3 text-value text-ink"
          onChange={(event) => setPaste(event.target.value)}
        />
      </label>
      <button
        type="button"
        className="min-h-11 w-fit cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
        onClick={() => {
          setMessage(null)
          setFailed(false)
          applyText(paste)
        }}
      >
        Import paste
      </button>
      {message !== null && (
        <p
          role={failed ? 'alert' : 'status'}
          className={failed ? 'm-0 text-value text-status-fault' : 'm-0 text-value text-ink-subtle'}
        >
          {message}
        </p>
      )}
    </section>
  )
}
