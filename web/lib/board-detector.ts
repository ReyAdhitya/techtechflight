/**
 * Picks the best ObjectDetector for the board.
 *
 * Order: local AI service (YOLO11x) when reachable → YOLOv8n wasm when weights load →
 * honest demo detector. The AI service is optional; a classroom without Python still works.
 */

import { createDemoDetector, demoDetector, type ObjectDetector } from './object-detection'
import { createYoloOnnxDetector } from './yolo-onnx-detector'
import { createHttpYoloDetector, resolveAiDetectUrl } from './http-yolo-detector'

let cached: Promise<ObjectDetector> | null = null

/** Lazy singleton — one probe / model load per page. */
export function boardDetector(): Promise<ObjectDetector> {
  if (!cached) {
    cached = (async () => {
      if (typeof window === 'undefined') return demoDetector

      const aiUrl = resolveAiDetectUrl()
      const http = await createHttpYoloDetector(aiUrl)
      if (http) return http

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
