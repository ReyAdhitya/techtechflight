'use client'

import * as Progress from '@radix-ui/react-progress'
import type { Telemetry } from '@techtechflight/contract'
import { motion, useReducedMotion } from 'motion/react'
import { formatBattery } from '@/lib/battery'
import { cn } from '@/lib/utils'

export interface BatteryLevelProps {
  readonly telemetry: Telemetry
  /** Stale readings are shown faded, and read out as last known rather than current. */
  readonly stale: boolean
  /**
   * Whether this charge is short of flying a lesson.
   *
   * Passed in from the derived Status rather than compared against a threshold here.
   * The ground station alone decides what counts as enough battery, and a second copy
   * of that number in the dashboard would drift the moment either changed.
   */
  readonly low: boolean
}

/**
 * Battery as a proportion, so a Teacher never has to know what a usable voltage is.
 *
 * Radix Progress is used for the correct progressbar role and value semantics — this is
 * one of the few places the board needs real behaviour rather than plain markup.
 */
export function BatteryLevel({ telemetry, stale, low }: BatteryLevelProps) {
  const percent = Math.round(telemetry.batteryFraction * 100)
  const reading = formatBattery(telemetry.batteryFraction)
  const reduced = useReducedMotion()

  const description = [
    stale ? 'Last known battery' : 'Battery',
    telemetry.batteryIsEstimate ? `${reading}, estimated` : reading,
  ].join(' ')

  return (
    <div className="flex items-center gap-3" data-stale={stale || undefined}>
      <Progress.Root
        className="h-1.5 flex-1 overflow-hidden rounded-pill bg-hairline"
        value={percent}
        max={100}
        aria-label={description}
      >
        <Progress.Indicator asChild>
          <motion.div
            className={cn(
              'h-full rounded-pill',
              stale ? 'bg-stale' : low ? 'bg-status-not-ready' : 'bg-ink',
            )}
            initial={false}
            animate={{ width: `${percent}%` }}
            transition={
              reduced ? { duration: 0 } : { type: 'spring', stiffness: 140, damping: 24 }
            }
            data-low={low || undefined}
          />
        </Progress.Indicator>
      </Progress.Root>
      <span
        className={cn('tnum text-value font-medium', stale ? 'text-stale' : 'text-ink')}
        aria-hidden="true"
      >
        {/* The tilde is the visible cue that the hardware cannot measure this precisely. */}
        {telemetry.batteryIsEstimate ? `~${reading}` : reading}
      </span>
    </div>
  )
}
