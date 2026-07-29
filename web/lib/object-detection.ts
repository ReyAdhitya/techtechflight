/**
 * App-side object detection for the camera surface.
 *
 * Telemetry may only say `camera?: { streaming: boolean }` — no URL, no boxes on
 * the wire (REQUIREMENTS). Detection runs in the browser against the pane.
 * Default path loads YOLOv8n ONNX (`board-detector.ts`); demo detector is the
 * offline / jsdom fallback (see docs/DECISIONS.md).
 */

/** A box in normalised frame coordinates (0–1 on each axis). */
export interface DetectionBox {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface Detection {
  readonly id: string
  readonly label: string
  /** Confidence in [0, 1]. */
  readonly confidence: number
  readonly box: DetectionBox
}

/**
 * What the detector is asked to look at.
 *
 * Real models need `source` (video / canvas / ImageData). The demo detector
 * ignores pixels and keys off `surfaceId` so jsdom still exercises the overlay.
 */
export interface DetectionFrame {
  readonly surfaceId: string
  readonly imageData?: ImageData
  /** Live pixels for ONNX / TF.js — HTMLVideoElement, canvas, or ImageData via wrapper. */
  readonly source?: CanvasImageSource | ImageData
}

/**
 * Something that names what it sees in a frame.
 *
 * `displayName` is shown to the Teacher next to the overlay. Do not put a model
 * family here unless that model is loaded.
 */
export interface ObjectDetector {
  readonly displayName: string
  /** True when this is a stand-in — UI must say so, same honesty as "Simulated feed". */
  readonly demo: boolean
  detect(frame: DetectionFrame): Promise<readonly Detection[]>
}

/**
 * Stable demo boxes for a given surface.
 *
 * Deterministic so jsdom tests and screenshots do not drift. Two boxes: a
 * "person" and a "marker", placed where a Teacher can see them on the dark feed.
 */
export function demoDetectionsFor(surfaceId: string): readonly Detection[] {
  const seed = surfaceId.length
  const personX = 0.12 + (seed % 5) * 0.02
  return [
    {
      id: `${surfaceId}:person`,
      label: 'person',
      confidence: 0.91,
      box: { x: personX, y: 0.28, width: 0.22, height: 0.4 },
    },
    {
      id: `${surfaceId}:marker`,
      label: 'marker',
      confidence: 0.78,
      box: { x: 0.58, y: 0.45, width: 0.18, height: 0.18 },
    },
  ]
}

/** Deterministic mock used on the simulated feed until a real model is wired. */
export function createDemoDetector(): ObjectDetector {
  return {
    displayName: 'Demo detector',
    demo: true,
    async detect(frame) {
      return demoDetectionsFor(frame.surfaceId)
    },
  }
}

/** Module-stable default so CameraPane does not restart the loop every render. */
export const demoDetector: ObjectDetector = createDemoDetector()
