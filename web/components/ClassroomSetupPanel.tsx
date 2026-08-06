'use client'

import { useEffect, useState } from 'react'
import { useFleet } from './FleetProvider'
import {
  fetchClassroomSetup,
  groundStationHttpOrigin,
  putClassroomSetup,
  type ClassroomSetupStatus,
  type ClassroomTelemetrySource,
} from '@/lib/classroom-setup'
import { cn } from '@/lib/utils'

/**
 * Classroom setup — Simulator vs Radio in plain words.
 *
 * Radio is MAVLink over UDP and monitoring-only (ADR-0011). Choosing a path writes a
 * preference the next ground-station launch reads; this process does not hot-swap.
 */
export function ClassroomSetupPanel() {
  const { demo, snapshot } = useFleet()
  const [status, setStatus] = useState<ClassroomSetupStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const reachable = !demo && snapshot.connection === 'live'

  useEffect(() => {
    if (!reachable || typeof window === 'undefined') {
      setStatus(null)
      return
    }
    const origin = groundStationHttpOrigin(window.location)
    let cancelled = false
    void fetchClassroomSetup(origin).then((next) => {
      if (!cancelled) setStatus(next)
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
        Pick how this laptop talks to the Fleet. The Simulator is the normal classroom path.
        Commands work. Radio reads real craft over MAVLink (the language drones use on the
        wire) and is watch-only for now. Stop and Hover do not reach hardware.
      </p>

      {demo ? (
        <p className="m-0 text-value text-ink-muted">
          Demonstration Fleet. This preview runs a Simulator in the browser. Radio needs the
          ground station on this laptop (:4321).
        </p>
      ) : !reachable ? (
        <p className="m-0 text-value text-ink-muted">
          Ground station not connected. Double-click Start TechTech Flight.bat, then refresh
          this page to choose Simulator or Radio.
        </p>
      ) : (
        <>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
            <dt className="label self-center">Using now</dt>
            <dd className="m-0 text-value">
              {status
                ? status.active === 'simulator'
                  ? 'Simulator'
                  : 'Radio (MAVLink), monitoring only'
                : '…'}
            </dd>
            <dt className="label self-center">Next launch</dt>
            <dd className="m-0 text-value">
              {status
                ? status.preferred === 'simulator'
                  ? 'Simulator'
                  : 'Radio (MAVLink)'
                : '…'}
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
              label="Radio (MAVLink)"
              selected={status?.preferred === 'mavlink'}
              disabled={busy || !status}
              onClick={() => void choose('mavlink')}
            />
          </div>

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
