import type { CameraState } from '@techtechflight/contract'
import type { ScenarioControls } from '@/lib/fleet-link'
import type { ObjectDetector } from '@/lib/object-detection'

/** Shown when a tile cannot report a detection tally. */
export const DETECTION_COUNT_UNAVAILABLE = '—'

export function detectorExposesCounts(detector: ObjectDetector): boolean {
  return detector.exposesCounts !== false
}

/**
 * Whether the Detect wall may run the in-browser detector for this Drone.
 *
 * Simulated streaming cameras only — same scope as CameraPane's overlay loop. Hardware
 * streams and idle cameras stay unavailable on the tally.
 */
export function canRunWallDetection(
  camera: CameraState | undefined,
  scenarios: ScenarioControls | null,
  detector: ObjectDetector,
): boolean {
  if (!detectorExposesCounts(detector)) return false
  if (scenarios === null) return false
  if (camera === undefined || !camera.streaming) return false
  return true
}

export function formatDetectionCount(count: number | null | undefined): string {
  if (count === null || count === undefined) return DETECTION_COUNT_UNAVAILABLE
  return String(count)
}

/** Sum known per-tile counts; null when every tile is unavailable. */
export function detectWallSummary(counts: readonly (number | null)[]): number | null {
  const known = counts.filter((count): count is number => count !== null)
  if (known.length === 0) return null
  return known.reduce((sum, count) => sum + count, 0)
}
