/**
 * Picks the best ObjectDetector for the board: YOLOv8n when weights load,
 * otherwise the honest demo detector.
 */

import { createDemoDetector, demoDetector, type ObjectDetector } from './object-detection'
import { createYoloOnnxDetector } from './yolo-onnx-detector'

let cached: Promise<ObjectDetector> | null = null

/** Lazy singleton — one model load per page. */
export function boardDetector(): Promise<ObjectDetector> {
  if (!cached) {
    cached = (async () => {
      if (typeof window === 'undefined') return demoDetector
      const yolo = await createYoloOnnxDetector()
      return yolo ?? createDemoDetector()
    })()
  }
  return cached
}

/** Tests only. */
export function resetBoardDetectorForTests(): void {
  cached = null
}
