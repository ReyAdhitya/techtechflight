'use client'

import * as ProgressPrimitive from '@radix-ui/react-progress'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

export interface ProgressProps {
  /** 0..100. */
  readonly value: number
  readonly label: string
  readonly className?: string
}

/**
 * shadcn's Progress — Radix underneath for the `progressbar` role and value semantics,
 * with the fill driven by Framer Motion rather than a CSS width transition.
 *
 * The spring matters here: a battery that snaps is read as a new fact, a battery that
 * travels is read as the same fact moving. Under `prefers-reduced-motion` it snaps,
 * because a Teacher who asked for less motion meant it.
 */
export function Progress({ value, label, className }: ProgressProps) {
  const reduced = useReducedMotion()
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <ProgressPrimitive.Root
      className={cn('sc-meter', className)}
      value={clamped}
      max={100}
      aria-label={label}
    >
      <ProgressPrimitive.Indicator asChild>
        <motion.div
          className="sc-meter__fill"
          initial={false}
          animate={{ width: `${clamped}%` }}
          transition={
            reduced ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 22 }
          }
        />
      </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
  )
}
