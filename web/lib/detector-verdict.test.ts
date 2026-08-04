import { describe, expect, it } from 'vitest'
import { detectorLabel, verdictFor, type VerdictInput } from './detector-verdict.ts'
import type { ObjectDetector } from './object-detection.ts'

/**
 * The Vision check exists to answer one question honestly, and the demo detector is the
 * thing that makes it hard: it draws two confident, stable boxes with no model loaded.
 * A check that showed those and said "working" would be worse than no check at all.
 */

const real: ObjectDetector = {
  displayName: 'YOLOv8n',
  demo: false,
  detect: async () => [],
}

const demo: ObjectDetector = {
  displayName: 'Demo detector',
  demo: true,
  detect: async () => [],
}

const input = (overrides: Partial<VerdictInput> = {}): VerdictInput => ({
  detector: real,
  cameraState: 'live',
  secureContext: true,
  framesRun: 30,
  detectionsSeen: 4,
  ...overrides,
})

describe('the verdict', () => {
  it('passes only with a real model, real pixels and something recognised', () => {
    const verdict = verdictFor(input())
    expect(verdict.state).toBe('pass')
    expect(verdict.fixes).toEqual([])
  })

  it('fails on the demo detector however good the boxes look', () => {
    /*
     * The most important case in this file. The demo detector returns two well-placed
     * boxes with plausible confidences, and a screen that trusted them would tell a
     * Teacher their vision module works when no model has been downloaded at all.
     */
    const verdict = verdictFor(input({ detector: demo, detectionsSeen: 2 }))
    expect(verdict.state).toBe('fail')
    expect(verdict.headline).toMatch(/invented/i)
    expect(verdict.fixes.join(' ')).toMatch(/fetch:yolo/)
  })

  it('reports a missing model before anything about the camera', () => {
    /*
     * Both are true when a Teacher opens the board at the laptop's network address on a
     * fresh checkout. The model comes first because fixing the URL would land them back
     * here with the same problem, and because the model is checkable with no camera.
     */
    const verdict = verdictFor(input({ detector: demo, secureContext: false }))
    expect(verdict.fixes.join(' ')).toMatch(/fetch:yolo/)
  })

  it('explains a non-secure origin before blaming permissions', () => {
    /*
     * Opening the board at the laptop's network address rather than on the laptop is the
     * single most likely way a Teacher gets here, and the browser reports it as a refused
     * camera. Saying "allow camera access" would send them to a setting that is not the
     * problem.
     */
    const verdict = verdictFor(input({ secureContext: false, cameraState: 'denied' }))
    expect(verdict.state).toBe('fail')
    expect(verdict.fixes.join(' ')).toMatch(/localhost/)
    expect(verdict.headline).not.toMatch(/refused/i)
  })

  it('says the model is fine when only the camera was refused', () => {
    const verdict = verdictFor(input({ cameraState: 'denied' }))
    expect(verdict.state).toBe('fail')
    // Tells them what is *not* wrong, so they stop looking there.
    expect(verdict.fixes.join(' ')).toMatch(/model is loaded/i)
  })

  it('does not call an empty room a failure', () => {
    /*
     * Loaded, running, recognising nothing. A ceiling produces no boxes and that is the
     * model working. Calling it broken would send a Teacher hunting a fault that is not
     * there.
     */
    const verdict = verdictFor(input({ detectionsSeen: 0 }))
    expect(verdict.state).toBe('inconclusive')
    expect(verdict.fixes.join(' ')).toMatch(/point the camera/i)
  })

  it('tells the Teacher which button to press rather than blaming a delay', () => {
    /*
     * A loaded model and a camera nobody has started is not a wait — it is a screen that
     * has not been told to begin. "Waiting for the camera" would be the console reporting
     * its own idleness as a condition.
     */
    const verdict = verdictFor(input({ cameraState: 'idle' }))
    expect(verdict.state).toBe('not-started')
    expect(verdict.headline).toMatch(/start the camera/i)
    expect(verdict.headline).toMatch(/model is loaded/i)
  })

  it('waits rather than judging before there is anything to judge', () => {
    expect(verdictFor(input({ detector: null })).state).toBe('checking')
    expect(verdictFor(input({ cameraState: 'requesting' })).state).toBe('checking')
    expect(verdictFor(input({ framesRun: 0, detectionsSeen: 0 })).state).toBe('checking')
    // A couple of frames is not enough to conclude nothing is there.
    expect(verdictFor(input({ framesRun: 3, detectionsSeen: 0 })).state).toBe('checking')
  })

  it('always gives a fix when it fails', () => {
    const failures = [
      input({ detector: demo }),
      input({ secureContext: false }),
      input({ cameraState: 'denied' }),
      input({ cameraState: 'unavailable' }),
    ]
    for (const candidate of failures) {
      const verdict = verdictFor(candidate)
      expect(verdict.state).toBe('fail')
      expect(verdict.fixes.length).toBeGreaterThan(0)
    }
  })

  it('never says something is fine while it is checking', () => {
    for (const state of ['checking', 'fail', 'inconclusive'] as const) {
      const verdict = verdictFor(
        state === 'checking'
          ? input({ detector: null })
          : state === 'fail'
            ? input({ detector: demo })
            : input({ detectionsSeen: 0 }),
      )
      expect(verdict.state).not.toBe('pass')
    }
  })
})

describe('what the header says is loaded', () => {
  it('names the model when there is one', () => {
    expect(detectorLabel(real)).toBe('YOLOv8n')
  })

  it('never lets the demo detector pass for a model', () => {
    // The `demo` flag is a contract, and this is where it is honoured on this screen.
    expect(detectorLabel(demo)).toMatch(/not a loaded model/)
  })

  it('says it is still loading rather than guessing', () => {
    expect(detectorLabel(null)).toBe('Loading…')
  })
})
