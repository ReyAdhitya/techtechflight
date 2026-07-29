import { describe, expect, it } from 'vitest'
import {
  createDemoDetector,
  demoDetectionsFor,
  type DetectionFrame,
  type ObjectDetector,
} from './object-detection'

describe('object detection for the camera pane', () => {
  it('gives stable demo boxes for a surface, without claiming a model family', async () => {
    const detector = createDemoDetector()
    expect(detector.demo).toBe(true)
    expect(detector.displayName.toLowerCase()).not.toMatch(/yolo/)

    const frame: DetectionFrame = { surfaceId: 'ttf-0001' }
    const once = await detector.detect(frame)
    const again = await detector.detect(frame)
    expect(once).toEqual(again)
    expect(once).toEqual(demoDetectionsFor('ttf-0001'))
    expect(once.every((d) => d.box.x >= 0 && d.box.x + d.box.width <= 1.0001)).toBe(true)
  })

  it('lets a custom detector implement the same interface', async () => {
    const custom: ObjectDetector = {
      displayName: 'Test detector',
      demo: true,
      async detect() {
        return [
          {
            id: 'only',
            label: 'cone',
            confidence: 0.5,
            box: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
          },
        ]
      },
    }
    const found = await custom.detect({ surfaceId: 'any' })
    expect(found).toHaveLength(1)
    expect(found[0]?.label).toBe('cone')
  })
})
