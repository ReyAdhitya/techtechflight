'use client'

import { useEffect, useRef, useState } from 'react'
import { LAND_ALL_HOLD_MS, issueLandAll, type LandAllTarget } from '@/lib/land-all'
import { cn } from '@/lib/utils'

/**
 * Land every airborne craft — hold to confirm.
 *
 * A single tap must not empty the room. About a second of hold, with a fill bar;
 * letting go early does nothing. Keyboard users get an explicit second press
 * (same guarantee as the old GuardedButton path). Issues `land` Commands via the
 * callback — ADR-0011, simulated Fleet only.
 */
export function LandAllButton({
  fleet,
  onLand,
  holdMs = LAND_ALL_HOLD_MS,
  className,
}: {
  readonly fleet: readonly LandAllTarget[]
  /** Integrator: `(droneId) => command(droneId, 'land')`. */
  readonly onLand: (droneId: string) => void
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
    issueLandAll(fleet, onLand)
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

  const label = `Land all (${airborne})`
  const confirmLabel = 'Press again to land all'

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
      <span className="relative">{armed ? confirmLabel : 'Land all — hold'}</span>
    </button>
  )
}
