/**
 * Detect when a camera picture has stopped updating.
 *
 * App-side only — not Telemetry, not a Fleet Command (ADR-0011). The Integrator
 * notes frame arrivals on the video element; this module decides when the gap
 * means “the picture has stopped”.
 */

/** Default silence before the board says the picture has stopped. */
export const DEFAULT_FROZEN_WINDOW_MS = 3_000

export type FrozenFeedInput = {
  /** Epoch ms of the last decoded / painted frame. Null when none yet. */
  readonly lastFrameAt: number | null
  /** Clock to compare against — inject in tests. */
  readonly now: number
  /** How long without a new frame before we call it frozen. */
  readonly windowMs?: number
  /**
   * When false (idle / no picture), never frozen — an idle pane is not a stuck
   * picture.
   */
  readonly streaming?: boolean
}

/**
 * True when a live feed has gone quiet longer than the window.
 *
 * Colour alone must not carry this — the notice component always says the words.
 */
export function isFeedFrozen({
  lastFrameAt,
  now,
  windowMs = DEFAULT_FROZEN_WINDOW_MS,
  streaming = true,
}: FrozenFeedInput): boolean {
  if (!streaming) return false
  if (lastFrameAt === null) return false
  if (windowMs <= 0) return false
  return now - lastFrameAt >= windowMs
}

/**
 * Per-craft frame clock the Integrator can tick from requestVideoFrameCallback
 * or a timeupdate probe. Session memory only.
 */
export type FrameClock = {
  readonly noteFrame: (at?: number) => void
  readonly lastFrameAt: () => number | null
  readonly reset: () => void
}

export function createFrameClock(): FrameClock {
  let last: number | null = null
  return {
    noteFrame(at = Date.now()) {
      last = at
    },
    lastFrameAt() {
      return last
    },
    reset() {
      last = null
    },
  }
}

/**
 * Words for the Teacher — shape and text together (ADR-0004). Kept here so tests
 * and the notice stay in lockstep.
 */
export const FROZEN_FEED_MESSAGE = 'Picture has stopped — no new frame in the last few seconds.'
