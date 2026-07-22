'use client'

import { useEffect, useState } from 'react'
import { animate, useMotionValue, useReducedMotion } from 'motion/react'

export interface AnimatedNumberProps {
  readonly value: number
  readonly className?: string
}

/**
 * A count that travels to its new value instead of jumping to it.
 *
 * The honest case for this on a Fleet board: "4 of 6 ready" becoming "3 of 6 ready" is
 * the single most important event on the screen, and a digit that swaps in place can be
 * missed entirely by someone facing the room. A count that rolls is caught peripherally.
 *
 * The honest case against is in COMPARISON.md, and it is that for most of the roll the
 * number on screen is a number the Fleet has never been in.
 *
 * Snaps under `prefers-reduced-motion`, and the accessible value is always the real one:
 * the rolling digits are `aria-hidden` and the caller states the true count in text.
 */
export function AnimatedNumber({ value, className }: AnimatedNumberProps) {
  const reduced = useReducedMotion()
  const motionValue = useMotionValue(value)
  const [shown, setShown] = useState(value)

  useEffect(() => {
    if (reduced) {
      motionValue.set(value)
      setShown(value)
      return
    }
    const controls = animate(motionValue, value, {
      duration: 0.75,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (next) => setShown(Math.round(next)),
    })
    return () => controls.stop()
  }, [value, reduced, motionValue])

  return (
    <span className={className} aria-hidden="true">
      {shown}
    </span>
  )
}
