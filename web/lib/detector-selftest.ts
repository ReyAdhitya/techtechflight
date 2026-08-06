import { boardDetector } from './board-detector'
import { lastDetectorError } from './yolo-onnx-detector'

/**
 * Run the detector once, on pixels this file makes, with no camera involved.
 *
 * The Vision check's live view answers "does it see people". This answers the question
 * underneath it — **does inference run at all** — and it needs answering separately
 * because the two failures look identical on screen. A model that throws on every frame
 * and a camera pointed at a blank wall both produce no boxes, and until now the screen
 * said the same thing about both: nothing recognised.
 *
 * It is also the only part of the check that works with no camera permission, which makes
 * it the thing to press first on a machine where the camera is the suspect.
 */

export interface SelfTestResult {
  readonly ok: boolean
  /** How long the single frame took, end to end. */
  readonly ms: number
  /** What the detector was when this ran — the real model, or the stand-in. */
  readonly detectorName: string
  readonly usedRealModel: boolean
  /** How many things it found in the test pattern. Zero is a fine answer. */
  readonly found: number
  /** Present only when inference itself failed. */
  readonly error: string | null
}

/** Big enough that letterboxing does something, small enough to be quick. */
const TEST_SIZE = 640

/**
 * A canvas with shapes on it.
 *
 * Deliberately **not** a photograph of a person. Shipping one would mean shipping somebody's
 * likeness with the product, and a synthetic figure is not something YOLO reliably
 * recognises anyway — a self-test that failed on its own fixture would be worse than none.
 *
 * So this fixture does not test recognition. It tests that a frame can be prepared, fed to
 * the model, run, and decoded without throwing, which is the failure that was actually
 * hiding. Finding nothing in it is a pass.
 */
function testPattern(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = TEST_SIZE
  canvas.height = TEST_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  ctx.fillStyle = '#2b2b2b'
  ctx.fillRect(0, 0, TEST_SIZE, TEST_SIZE)
  // Some structure, so the tensor is not a constant and the run is representative.
  for (let i = 0; i < 8; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? '#d8d2c6' : '#8a8578'
    ctx.fillRect(i * 80, 0, 40, TEST_SIZE)
  }
  ctx.fillStyle = '#f0a500'
  ctx.beginPath()
  ctx.arc(TEST_SIZE / 2, TEST_SIZE / 2, 120, 0, Math.PI * 2)
  ctx.fill()

  return canvas
}

export async function runSelfTest(): Promise<SelfTestResult> {
  const detector = await boardDetector()
  const startedAt = performance.now()

  let found = 0
  let threw: string | null = null

  try {
    const detections = await detector.detect({
      surfaceId: 'vision-self-test',
      source: testPattern(),
    })
    found = detections.length
  } catch (error) {
    threw = error instanceof Error ? error.message : String(error)
  }

  const ms = Math.round(performance.now() - startedAt)

  /*
   * `detect()` returns an empty array both when it found nothing and when it failed, so
   * the recorded error is the only way to tell those apart. Checking it here is what makes
   * this a test rather than a second way of looking at the same ambiguity.
   */
  const recorded = lastDetectorError()
  const error = threw ?? recorded

  return {
    ok: error === null && !detector.demo,
    ms,
    detectorName: detector.displayName,
    usedRealModel: !detector.demo,
    found,
    error,
  }
}

/** What the Teacher reads about a finished self-test. */
export function selfTestWords(result: SelfTestResult): string {
  /*
   * "No model" is checked before "it threw", and the order matters. When loading fails,
   * the stand-in answers *and* an error is on record — but that error is about loading,
   * not about the frame, and reporting "inference failed" would send a Teacher looking at
   * the wrong thing. The reason is carried along rather than dropped.
   */
  if (!result.usedRealModel) {
    const because = result.error ? ` (${result.error})` : ''
    return `The stand-in detector answered. No model is loaded, so this proves nothing${because}.`
  }
  if (result.error) return `Inference failed · ${result.error}`
  return `Inference ran in ${result.ms} ms. The model is working.`
}
