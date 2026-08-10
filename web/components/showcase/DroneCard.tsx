'use client'

import { motion, useReducedMotion } from 'motion/react'
import type { DroneState } from '@techtechflight/contract'
import { formatAge, formatExactTime } from '@/lib/age'
import { formatBattery, formatTimeToReady } from '@/lib/battery'
import { STATUS_PRESENTATION } from '@/lib/status-presentation'
import { cn } from '@/lib/utils'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { HoverCard } from './ui/hover-card'
import { Progress } from './ui/progress'

export interface DroneCardProps {
  readonly drone: DroneState
  /** Null when this Drone has never responded. */
  readonly ageMs: number | null
  readonly selected: boolean
  /** True for about a second after this Drone's Status actually changed. */
  readonly changed: boolean
  readonly onSelect: () => void
  readonly onOpenDetail: () => void
}

/**
 * One Drone, as a card.
 *
 * Same facts as the restrained board's tile, in the same order, using the same words:
 * name, Status, battery, when it will be Ready, Last Contact. What is added is depth,
 * a Status wash, a rail, an animated meter and a Hover Card on the Last Contact line.
 *
 * The card as a whole selects the Drone for the 3D stage; Details opens its panel. The
 * select target is a real button stretched across the card rather than a click handler
 * on the article, so the card is reachable by keyboard and announces what it does.
 */
export function DroneCard({
  drone,
  ageMs,
  selected,
  changed,
  onSelect,
  onOpenDetail,
}: DroneCardProps) {
  const reduced = useReducedMotion()
  const offline = drone.status === 'Offline'
  const noResponseYet = drone.lastContact === null
  const { telemetry } = drone

  return (
    <motion.article
      layout={!reduced}
      className="sc-glass sc-card"
      data-status={drone.status}
      data-selected={selected || undefined}
      data-changed={changed || undefined}
      data-stale={drone.stale || undefined}
      initial={reduced ? false : { opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      {...(reduced ? {} : { exit: { opacity: 0, y: -8, scale: 0.985 } })}
      transition={
        reduced ? { duration: 0 } : { type: 'spring', stiffness: 240, damping: 28 }
      }
    >
      <span className="sc-card__rail" aria-hidden="true" />

      <div className="flex items-start justify-between gap-3">
        <h3 className="m-0 text-[length:var(--sc-text-lg)] font-semibold tracking-[-0.02em]">
          <button type="button" className="sc-card__select" onClick={onSelect}>
            {drone.name}
            <span className="sc-visually-hidden">
              {' '}
             , show on the 3D stage
            </span>
          </button>
        </h3>
        <Badge status={drone.status} />
      </div>

      <div className="mt-auto flex flex-col gap-2">
        {telemetry ? (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="sc-label">
                {drone.stale ? 'Last known battery' : 'Battery'}
              </span>
              <span className="sc-tnum text-[length:var(--sc-text-sm)] font-semibold">
                {telemetry.batteryIsEstimate && '~'}
                {formatBattery(telemetry.batteryFraction)}
              </span>
            </div>
            <Progress
              value={Math.round(telemetry.batteryFraction * 100)}
              label={[
                drone.stale ? 'Last known battery' : 'Battery',
                telemetry.batteryIsEstimate
                  ? `${formatBattery(telemetry.batteryFraction)}, estimated`
                  : formatBattery(telemetry.batteryFraction),
              ].join(' ')}
            />
          </>
        ) : (
          <p className="m-0 text-sm text-[var(--sc-ink-muted)]">No Telemetry yet</p>
        )}

        {/* Only ever present when the ground station has watched the charge go in. */}
        {drone.timeToReadyMs !== null && (
          <p
            className="sc-tnum m-0 text-sm font-semibold"
            style={{ color: 'var(--sc-not-ready)' }}
          >
            {formatTimeToReady(drone.timeToReadyMs)}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/*
         * Last Contact. The Hover Card carries the exact moment and what the age means,
         * for a Teacher who wants to judge for themselves — and everything in it is also
         * in the Drone's panel, because a hover is unreachable by touch and by keyboard.
         */}
        <HoverCard
          content={
            <div className="flex flex-col gap-1">
              <span className="sc-label">Last Contact</span>
              <span className="sc-tnum">
                {noResponseYet ? 'No response yet' : formatExactTime(drone.lastContact ?? 0)}
              </span>
              <span className="text-[var(--sc-ink-muted)]">
                {drone.stale
                  ? 'Old enough that this reading may no longer be true.'
                  : STATUS_PRESENTATION[drone.status].meaning}
              </span>
            </div>
          }
        >
          <p
            className={cn('sc-tnum sc-contact m-0 cursor-help text-sm', drone.stale && 'italic')}
            data-muted={offline || drone.stale || undefined}
          >
            {noResponseYet ? 'No response yet' : `Response ${formatAge(ageMs ?? 0)}`}
          </p>
        </HoverCard>

        <Button
          size="sm"
          variant="ghost"
          className="relative z-[1]"
          onClick={onOpenDetail}
        >
          Details
          <span className="sc-visually-hidden"> for {drone.name}</span>
        </Button>
      </div>
    </motion.article>
  )
}
