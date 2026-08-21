'use client'

import { useEffect, useState } from 'react'
import { useFleet } from './FleetProvider'
import {
  fetchClassroomSetup,
  fetchIpadUrl,
  groundStationHttpOrigin,
  putClassroomSetup,
  type ClassroomSetupStatus,
  type ClassroomTelemetrySource,
} from '@/lib/classroom-setup'
import { cn } from '@/lib/utils'

/**
 * Classroom setup — Simulator, School drones (Wi-Fi), or Radio.
 *
 * Hardware paths are monitoring-only (ADR-0011). Choosing a path writes a preference the
 * next ground-station launch reads; this process does not hot-swap.
 */
export function ClassroomSetupPanel() {
  const { demo, snapshot } = useFleet()
  const [status, setStatus] = useState<ClassroomSetupStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [ipad, setIpad] = useState<string | null>(null)

  const reachable = !demo && snapshot.connection === 'live'

  useEffect(() => {
    if (!reachable || typeof window === 'undefined') {
      setStatus(null)
      setIpad(null)
      return
    }
    const origin = groundStationHttpOrigin(window.location)
    let cancelled = false
    void fetchClassroomSetup(origin).then((next) => {
      if (!cancelled) setStatus(next)
    })
    void fetchIpadUrl(origin).then((url) => {
      if (!cancelled) setIpad(url)
    })
    return () => {
      cancelled = true
    }
  }, [reachable])

  async function choose(source: ClassroomTelemetrySource) {
    if (!reachable || typeof window === 'undefined') return
    setBusy(true)
    setNote(null)
    const origin = groundStationHttpOrigin(window.location)
    const next = await putClassroomSetup(origin, source)
    setBusy(false)
    if (!next) {
      setNote('Could not save that choice. Is the ground station still running?')
      return
    }
    setStatus(next)
    setNote(
      next.restartRequired
        ? 'Saved. Close the Ground Station window, then double-click Start TechTech Flight.bat again.'
        : 'Already on that path. No restart needed.',
    )
  }

  return (
    <section className="flex flex-col gap-3 rounded-surface border border-hairline bg-surface-1 p-5">
      <h2 className="label m-0">Classroom setup</h2>
      <p className="m-0 text-value text-ink-subtle">
        Pick how this laptop talks to the Fleet. Simulator is the usual path. School drones
        listen on this Wi-Fi. Radio (MAVLink) is for bought controllers. Hardware is
        watch-only: Stop and Hover do not reach an aircraft.
      </p>

      {demo ? (
        <p className="m-0 text-value text-ink-muted">
          Demonstration Fleet. This preview runs a Simulator in the browser. School drones
          need the ground station on this laptop (:4321).
        </p>
      ) : !reachable ? (
        <p className="m-0 text-value text-ink-muted">
          Ground station not connected. Double-click Start TechTech Flight.bat, then refresh
          this page to choose a path.
        </p>
      ) : (
        <>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
            <dt className="label self-center">Using now</dt>
            <dd className="m-0 text-value">{status ? pathLabel(status.active, true) : '…'}</dd>
            <dt className="label self-center">Next launch</dt>
            <dd className="m-0 text-value">
              {status ? pathLabel(status.preferred, false) : '…'}
            </dd>
          </dl>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Fleet path">
            <PathButton
              label="Simulator"
              selected={status?.preferred === 'simulator'}
              disabled={busy || !status}
              onClick={() => void choose('simulator')}
            />
            <PathButton
              label="School drones (Wi-Fi)"
              selected={status?.preferred === 'esp'}
              disabled={busy || !status}
              onClick={() => void choose('esp')}
            />
            <PathButton
              label="Radio (MAVLink)"
              selected={status?.preferred === 'mavlink'}
              disabled={busy || !status}
              onClick={() => void choose('mavlink')}
            />
          </div>

          {ipad ? (
            <p className="m-0 text-value text-ink">
              iPads open {ipad}{' '}
              <button
                type="button"
                className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-3 py-1 text-value text-ink hover:border-ink"
                onClick={() => {
                  void navigator.clipboard?.writeText(ipad)
                }}
              >
                Copy
              </button>
            </p>
          ) : null}

          {note ? <p className="m-0 text-value text-ink-muted">{note}</p> : null}
          {status?.restartRequired ? (
            <p className="m-0 text-value text-ink-muted">
              Preference differs from the running ground station. Restart to apply.
            </p>
          ) : null}
        </>
      )}
    </section>
  )
}

function pathLabel(source: ClassroomTelemetrySource, monitoring: boolean): string {
  if (source === 'simulator') return 'Simulator'
  if (source === 'esp') {
    return monitoring ? 'School drones (Wi-Fi), monitoring only' : 'School drones (Wi-Fi)'
  }
  return monitoring ? 'Radio (MAVLink), monitoring only' : 'Radio (MAVLink)'
}

function PathButton({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string
  selected: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'min-h-11 cursor-pointer rounded-pill border px-4 py-2 text-value',
        selected
          ? 'border-ink bg-ink text-canvas'
          : 'border-hairline bg-transparent text-ink hover:border-ink',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      {label}
    </button>
  )
}
