'use client'

import { useEffect, useRef, useState } from 'react'
import { LAND_ALL_HOLD_MS } from '@/lib/land-all'
import { issueHoverAll, type HoverAllTarget } from '@/lib/hover-all'
import { cn } from '@/lib/utils'

/**
 * Hover every airborne craft — hold to confirm.
 *
 * Same hold / keyboard-confirm pattern as Land all. Issues `hold` Commands via the
 * callback — ADR-0011, simulated Fleet only.
 */
export function HoverAllButton({
  fleet,
  onHover,
  holdMs = LAND_ALL_HOLD_MS,
  className,
}: {
  readonly fleet: readonly HoverAllTarget[]
  /** Integrator: `(droneId) => command(droneId, 'hold')`. */
  readonly onHover: (droneId: string) => void
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
    issueHoverAll(fleet, onHover)
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

  const label = `Hover all (${airborne})`
  const confirmLabel = 'Press again to hover all'

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
        'relative min-h-11 cursor-pointer overflow-hidden rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink',
        armed && 'border-ink bg-canvas',
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-ink opacity-10"
        style={{ width: `${Math.round(progress * 100)}%` }}
      />
      <span className="relative">{armed ? confirmLabel : 'Hover all — hold'}</span>
    </button>
  )
}
