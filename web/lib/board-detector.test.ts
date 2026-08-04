import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./yolo-onnx-detector', () => ({
  createYoloOnnxDetector: vi.fn(async () => null),
}))

vi.mock('./http-yolo-detector', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./http-yolo-detector')>()
  return {
    ...actual,
    createHttpYoloDetector: vi.fn(async () => null),
  }
})

import { boardDetector, resetBoardDetectorForTests } from './board-detector'

describe('the board detector', () => {
  beforeEach(() => {
    resetBoardDetectorForTests()
  })

  it('falls back to the demo detector when AI service and YOLO cannot load', async () => {
    const detector = await boardDetector()
    expect(detector.demo).toBe(true)
    expect(detector.displayName).toMatch(/Demo/i)
    const boxes = await detector.detect({ surfaceId: 'ttf-0001' })
    expect(boxes.some((b) => b.label === 'person')).toBe(true)
  })
})
