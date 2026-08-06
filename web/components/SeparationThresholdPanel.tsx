'use client'

import { useState } from 'react'
import {
  DEFAULT_SEPARATION_THRESHOLD_M,
  formatSeparationThresholdM,
  parseSeparationThresholdM,
  readSeparationThresholdM,
  resetSeparationThresholdM,
  writeSeparationThresholdM,
} from '@/lib/separation-thresholds'

/**
 * Settings control for the separation alarm distance.
 *
 * Defaults to today's 1.5 m warning. Changing it only writes this browser's preference —
 * no Command path (ADR-0011). The Integrator mounts this on SettingsScreen.
 */
export function SeparationThresholdPanel() {
  const [metres, setMetres] = useState(() =>
    typeof window === 'undefined' ? DEFAULT_SEPARATION_THRESHOLD_M : readSeparationThresholdM(),
  )
  const [draft, setDraft] = useState(() => String(metres))
  const [note, setNote] = useState<string | null>(null)

  const save = () => {
    const parsed = parseSeparationThresholdM(draft)
    if (parsed === null) {
      setNote('Enter a distance in metres, for example 1.5.')
      return
    }
    writeSeparationThresholdM(parsed)
    setMetres(parsed)
    setDraft(String(parsed))
    setNote(`Saved, alarm when craft are closer than ${formatSeparationThresholdM(parsed)}.`)
  }

  const restoreDefault = () => {
    resetSeparationThresholdM()
    setMetres(DEFAULT_SEPARATION_THRESHOLD_M)
    setDraft(String(DEFAULT_SEPARATION_THRESHOLD_M))
    setNote(
      `Back to today's default (${formatSeparationThresholdM(DEFAULT_SEPARATION_THRESHOLD_M)}).`,
    )
  }

  return (
    <section className="flex flex-col gap-3 rounded-surface border border-hairline bg-surface-1 p-5">
      <h2 className="label m-0">Separation alarm</h2>
      <p className="m-0 text-value text-ink-subtle">
        How close two Flying Drones may get before the board asks you to separate them.
        Default is {formatSeparationThresholdM(DEFAULT_SEPARATION_THRESHOLD_M)}. The same
        distance the board uses today.
      </p>

      <label className="flex max-w-md flex-col gap-1">
        <span className="label">Warn below (metres)</span>
        <input
          type="number"
          inputMode="decimal"
          min={0.5}
          max={10}
          step={0.1}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            setNote(null)
          }}
          className="min-h-11 rounded-pill border border-hairline bg-canvas px-4 py-1.5 text-value text-ink tnum"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          className="min-h-11 cursor-pointer rounded-pill border-0 bg-ink px-4 py-1.5 text-value font-medium text-canvas"
        >
          Save distance
        </button>
        <button
          type="button"
          onClick={restoreDefault}
          className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
        >
          Use today&apos;s default
        </button>
      </div>

      <p className="m-0 tnum text-value text-ink-muted">
        Using {formatSeparationThresholdM(metres)} now.
      </p>
      {note !== null && <p className="m-0 text-value text-ink-subtle">{note}</p>}
    </section>
  )
}
