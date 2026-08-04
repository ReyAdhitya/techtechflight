/**
 * Frames per second and per-frame latency for the in-browser detector.
 *
 * Pure numbers and words — no React. Vision check and camera surfaces pass frame
 * timestamps and latencies; this module averages them when there is enough to say,
 * and names the gap in words when there is not.
 */

export const MIN_FRAMES_FOR_AVERAGE = 2

export interface TimingFrame {
  /** When inference finished, in epoch ms. */
  readonly finishedAtMs: number
  /** How long that frame took, in ms. */
  readonly latencyMs: number
}

export interface DetectorTiming {
  readonly fps: number | null
  readonly latencyMs: number | null
  readonly fpsWords: string
  readonly latencyWords: string
}

const NOT_ENOUGH_FRAMES_WORDS = 'Not enough frames yet'
const LATENCY_NOT_MEASURED_WORDS = 'Not measured yet'

/** Append one finished frame, keeping the most recent window for averaging. */
export function appendTimingFrame(
  frames: readonly TimingFrame[],
  latencyMs: number,
  finishedAtMs: number,
  maxFrames = 30,
): readonly TimingFrame[] {
  const next = [...frames, { finishedAtMs, latencyMs }]
  if (next.length <= maxFrames) return next
  return next.slice(next.length - maxFrames)
}

export function detectorTiming(frames: readonly TimingFrame[]): DetectorTiming {
  if (frames.length < MIN_FRAMES_FOR_AVERAGE) {
    return {
      fps: null,
      latencyMs: null,
      fpsWords: NOT_ENOUGH_FRAMES_WORDS,
      latencyWords: LATENCY_NOT_MEASURED_WORDS,
    }
  }

  const latencyMs = Math.round(
    frames.reduce((sum, frame) => sum + frame.latencyMs, 0) / frames.length,
  )

  const first = frames[0]!
  const last = frames[frames.length - 1]!
  const elapsedMs = last.finishedAtMs - first.finishedAtMs
  const fps =
    elapsedMs > 0
      ? round((frames.length - 1) / (elapsedMs / 1000))
      : null

  return {
    fps,
    latencyMs,
    fpsWords: fps === null ? NOT_ENOUGH_FRAMES_WORDS : `${fps} frames per second`,
    latencyWords: `${latencyMs} ms per frame`,
  }
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}
