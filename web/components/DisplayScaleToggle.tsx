'use client'

import { useEffect, useState } from 'react'
import { Minimize2, Projector } from 'lucide-react'
import { applyDisplayScale, readDisplayScale } from '@/lib/display-scale'

/**
 * Switches the board into large format.
 *
 * Deliberately the same weight of control as the theme toggle, and sat beside it, for
 * the same reason: both are set once when a room is set up, not touched during a lesson.
 * The label names what pressing it will do rather than what the board currently is, so a
 * Teacher never has to work out which way round it reads.
 */
export function DisplayScaleToggle() {
  const [large, setLarge] = useState(false)
  const [mounted, setMounted] = useState(false)

  /*
   * The stored choice is unknowable until the client has read it, and rendering a guess
   * would swap the label under a Teacher on hydration.
   *
   * This re-applies the stored value rather than trusting the layout's pre-paint script
   * to have done it. That script exists only to avoid a flash, and it is not the source
   * of truth: when the two disagreed, the board was one size while the button offered to
   * switch to the size it was already in, and pressing it went the wrong way. Applying
   * here makes storage, document and label agree by construction.
   */
  useEffect(() => {
    const stored = readDisplayScale()
    applyDisplayScale(stored)
    setLarge(stored)
    setMounted(true)
  }, [])

  const toggle = () => {
    const next = !large
    setLarge(next)
    applyDisplayScale(next)
  }
  const ScaleIcon = mounted && large ? Minimize2 : Projector

  return (
    <button
      type="button"
      // Positioned by the control cluster in the page, not here. Hover uses the plain
      // colour transition rather than the board's settle speed — interaction feedback
      // should be immediate, where news about a Drone is meant to be caught in passing.
      className="label inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-pill border border-hairline bg-canvas px-3 py-1.5 text-ink-muted transition-colors hover:border-ink hover:text-ink"
      onClick={toggle}
      aria-label={
        mounted
          ? large
            ? 'Switch to standard size'
            : 'Switch to large format'
          : 'Switch display size'
      }
    >
      <ScaleIcon className="size-4" strokeWidth={1.75} aria-hidden="true" />
      <span className="room-control-label">
        {mounted ? (large ? 'Standard size' : 'Large format') : 'Size'}
      </span>
    </button>
  )
}
