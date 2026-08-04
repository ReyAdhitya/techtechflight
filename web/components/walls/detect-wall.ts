import type { CameraState } from '@techtechflight/contract'
import type { ScenarioControls } from '@/lib/fleet-link'
import type { ObjectDetector } from '@/lib/object-detection'

/** Shown when a tile cannot report a detection tally — never an invented zero. */
export const DETECTION_COUNT_UNAVAILABLE = 'Cannot count'

export function detectorExposesCounts(_detector: ObjectDetector): boolean {
  return true
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

/** Whether a video element has real pixels ready for inference. */
export function hasReadyPixelSource(
  source: CanvasImageSource | undefined,
): source is CanvasImageSource {
  if (source === undefined) return false
  if (source instanceof HTMLVideoElement) {
    return source.readyState >= 2 && source.videoWidth > 0 && source.videoHeight > 0
  }
  return true
}

/**
 * Turn detections into a tally only when pixels were actually measured.
 *
 * Null means the wall must say it cannot count — including when inference never ran on
 * a real frame.
 */
export function detectionCountFromDetections(
  detections: readonly unknown[],
  hadPixels: boolean,
): number | null {
  if (!hadPixels) return null
  return detections.length
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
