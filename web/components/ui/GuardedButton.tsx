'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * A control that will not fire by accident.
 *
 * Emergency stop has to be fast — a modal is not fast — and it must not be possible to
 * trigger on the wrong Drone with a stray tap. Physical guarded switches solve exactly
 * this, with deliberate effort rather than with a question, so this is a press and hold:
 * about a second, with a bar that fills, and letting go early does nothing.
 *
 * Holding is not available to everyone. A keyboard or switch user gets an explicit second
 * press instead — two paths, the same guarantee, neither of them a dialog to dismiss.
 */
export function GuardedButton({
  label,
  confirmLabel,
  onConfirm,
  holdMs = 900,
  className,
}: {
  readonly label: string
  /** What it says once it is armed and waiting for the second press. */
  readonly confirmLabel: string
  readonly onConfirm: () => void
  readonly holdMs?: number
  readonly className?: string
}) {
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

  const beginHolding = () => {
    if (started.current !== null) return
    started.current = performance.now()
    const step = () => {
      if (started.current === null) return
      const held = performance.now() - started.current
      if (held >= holdMs) {
        stopHolding()
        onConfirm()
        return
      }
      setProgress(held / holdMs)
      frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
  }

  return (
    <button
      type="button"
      aria-label={armed ? confirmLabel : label}
      onPointerDown={beginHolding}
      onPointerUp={stopHolding}
      onPointerLeave={stopHolding}
      onPointerCancel={stopHolding}
      // Keyboard and switch users cannot hold. An explicit second press instead.
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        if (armed) {
          setArmed(false)
          onConfirm()
          return
        }
        setArmed(true)
      }}
      onBlur={() => setArmed(false)}
      className={cn(
        'relative min-h-11 cursor-pointer overflow-hidden rounded-pill border px-4 py-1.5 text-value',
        armed
          ? 'border-status-fault bg-status-fault text-canvas'
          : 'border-status-fault bg-transparent text-status-fault',
        className,
      )}
    >
      {/* Fills as the press is held. Beneath the words, so the label stays readable. */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-status-fault opacity-20"
        style={{ width: `${Math.round(progress * 100)}%` }}
      />
      <span className="relative">{armed ? confirmLabel : label}</span>
    </button>
  )
}
