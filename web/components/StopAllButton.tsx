'use client'

import { useEffect, useRef, useState } from 'react'
import { LAND_ALL_HOLD_MS } from '@/lib/land-all'
import { issueStopAll, type StopAllTarget } from '@/lib/stop-all'
import { cn } from '@/lib/utils'

/**
 * Stop every airborne craft — hold to confirm on the fleet action.
 *
 * Per-strip Stop stays a single press (DESIGN §4.5). Fleet-wide Stop uses the same hold
 * pattern as Land all so a glance-misclick on the projector does not cut every motor.
 * Issues `emergency-stop` via the callback — ADR-0011, simulated Fleet only.
 */
export function StopAllButton({
  fleet,
  onStop,
  holdMs = LAND_ALL_HOLD_MS,
  className,
}: {
  readonly fleet: readonly StopAllTarget[]
  /** Integrator: `(droneId) => command(droneId, 'emergency-stop')`. */
  readonly onStop: (droneId: string) => void
  readonly holdMs?: number
  readonly className?: string
}) {
  const airborne = fleet.filter((entry) => entry.airborne).length
  const [progress, setProgress] = useState(0)
  const [armed, setArmed] = useState(false)
  const started = useRef<number | null>(null)
  const frame = useRef<number | null>(null)

  const stopHolding = () => {
    started.current = null
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    setProgress(0)
  }

  useEffect(() => stopHolding, [])

  if (airborne === 0) return null

  const fire = () => {
    issueStopAll(fleet, onStop)
    setArmed(false)
  }

  const beginHolding = () => {
    if (started.current !== null) return
    started.current = performance.now()
    const step = () => {
      if (started.current === null) return
      const held = performance.now() - started.current
      if (held >= holdMs) {
        stopHolding()
        fire()
        return
      }
      setProgress(held / holdMs)
      frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
  }

  const label = `Stop all (${airborne})`
  const confirmLabel = 'Press again to stop all'

  return (
    <button
      type="button"
      aria-label={armed ? confirmLabel : `${label} — hold to confirm`}
      onPointerDown={beginHolding}
      onPointerUp={stopHolding}
      onPointerLeave={stopHolding}
      onPointerCancel={stopHolding}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        if (armed) {
          fire()
          return
        }
        setArmed(true)
      }}
      onBlur={() => setArmed(false)}
      className={cn(
        'relative min-h-11 cursor-pointer overflow-hidden rounded-pill border px-4 py-1.5 text-value',
        armed
          ? 'border-status-fault bg-status-fault text-canvas'
          : 'border-status-fault bg-transparent text-status-fault hover:border-ink hover:text-ink',
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-status-fault opacity-20"
        style={{ width: `${Math.round(progress * 100)}%` }}
      />
      <span className="relative">{armed ? confirmLabel : 'Stop all — hold'}</span>
    </button>
  )
}
