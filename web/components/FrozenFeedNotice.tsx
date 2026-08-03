'use client'

import {
  DEFAULT_FROZEN_WINDOW_MS,
  FROZEN_FEED_MESSAGE,
  isFeedFrozen,
} from '@/lib/frozen-feed'
import { cn } from '@/lib/utils'

/**
 * Overlay copy when the camera picture has stopped updating.
 *
 * Mount on CameraPane (Integrator). Pass `lastFrameAt` from a frame clock the
 * Integrator ticks; this component only decides and speaks. Not a Command
 * (ADR-0011); stream URLs stay out of Telemetry.
 */
export function FrozenFeedNotice({
  lastFrameAt,
  now,
  windowMs = DEFAULT_FROZEN_WINDOW_MS,
  streaming = true,
  className,
}: {
  readonly lastFrameAt: number | null
  readonly now: number
  readonly windowMs?: number
  readonly streaming?: boolean
  readonly className?: string
}) {
  if (!isFeedFrozen({ lastFrameAt, now, windowMs, streaming })) return null

  return (
    <p
      role="alert"
      className={cn(
        'm-0 rounded-surface border border-status-not-ready bg-surface-1/95 px-3 py-2 text-value text-status-not-ready shadow-none',
        className,
      )}
    >
      {FROZEN_FEED_MESSAGE}
    </p>
  )
}
