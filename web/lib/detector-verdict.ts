import type { ObjectDetector } from './object-detection.ts'

/**
 * Whether object detection is actually working on this machine.
 *
 * The whole point of the Vision check is to answer that with a word rather than with a
 * picture that looks convincing either way. The demo detector draws two perfectly good
 * boxes without a model loaded, and on the camera surface that is honest because the pane
 * says "not a loaded model" beside it — but a *check* that showed those boxes and called
 * it working would be worse than no check at all.
 *
 * So the verdict is deliberately hard to pass: a real model, real pixels, and something
 * actually recognised. Anything less is named, with the thing to do about it.
 */

export type VerdictState =
  /** Nothing has been tried yet. */
  | 'not-started'
  /** Waiting on the model, the camera, or the first frames. */
  | 'checking'
  /** Detection is working. */
  | 'pass'
  /** Something is stopping it, and the reason is known. */
  | 'fail'
  /** Everything is loaded and nothing has been recognised — which may be the room. */
  | 'inconclusive'

export interface VerdictInput {
  /** Null while the detector is still being built. */
  readonly detector: ObjectDetector | null
  /** Whether `getUserMedia` gave us a camera. */
  readonly cameraState: 'idle' | 'requesting' | 'live' | 'denied' | 'unavailable'
  /** Whether the page is on a secure origin, which the camera requires. */
  readonly secureContext: boolean
  /** How many frames have been through the detector. */
  readonly framesRun: number
  /** How many things it has recognised across those frames. */
  readonly detectionsSeen: number
}

export interface Verdict {
  readonly state: VerdictState
  /** One line, in the register of the rest of the board. */
  readonly headline: string
  /** What to do about it. Empty when there is nothing to do. */
  readonly fixes: readonly string[]
}

/** How many frames must run before "nothing recognised" means anything. */
const ENOUGH_FRAMES = 12

export function verdictFor(input: VerdictInput): Verdict {
  const { detector, cameraState, secureContext, framesRun, detectionsSeen } = input

  if (detector === null) {
    return { state: 'checking', headline: 'Loading the detection model…', fixes: [] }
  }

  /*
   * The model is checked before anything about the camera, deliberately.
   *
   * It is the one thing here that can be established with no camera at all, it is fatal
   * however the page was opened, and it is the failure this screen exists to catch — a
   * demo detector produces confident, stable, entirely invented boxes. Reporting the
   * origin first would send a Teacher to fix their URL and arrive back at the same
   * screen still with no model.
   */
  if (detector.demo) {
    return {
      state: 'fail',
      headline: 'No detection model is loaded. The boxes below are invented.',
      fixes: [
        'Run `npm run fetch:yolo` to download the weights (about 12 MB), then reload.',
        'The weights are not kept in the repository, so a fresh checkout never has them.',
      ],
    }
  }

  /*
   * Then the secure-origin rule, because it explains a denied camera that looks like a
   * permissions problem and is not. Browsers block `getUserMedia` on a plain http origin
   * other than localhost, which is exactly what a Teacher hits when they open the board on
   * the classroom laptop's network address instead of on the laptop itself.
   */
  if (!secureContext) {
    return {
      state: 'fail',
      headline: 'The browser will not open a camera on this address.',
      fixes: [
        'Open the board at http://localhost:4321 on the machine itself, not at its network address.',
        'A camera needs a secure origin. localhost counts as one; a plain http:// address on the network does not.',
      ],
    }
  }

  if (cameraState === 'denied') {
    return {
      state: 'fail',
      headline: 'The camera was refused, so there are no pixels to detect in.',
      fixes: [
        'Allow camera access for this site in the browser, then reload.',
        'The model is loaded and ready. This is the only thing in the way.',
      ],
    }
  }

  if (cameraState === 'unavailable') {
    return {
      state: 'fail',
      headline: 'This machine reports no camera.',
      fixes: [
        'Plug in a webcam, or open this on a machine that has one.',
        'The model is loaded and would run if there were pixels.',
      ],
    }
  }

  /*
   * Nothing is wrong yet — the Teacher simply has not started. Saying "waiting for the
   * camera" here would be the screen blaming a delay on itself, when what it needs to do
   * is say which button to press.
   */
  if (cameraState === 'idle') {
    return {
      state: 'not-started',
      headline: 'The model is loaded. Start the camera to check it against real pixels.',
      fixes: [],
    }
  }

  if (cameraState !== 'live') {
    return { state: 'checking', headline: 'Waiting for the camera…', fixes: [] }
  }

  if (framesRun === 0) {
    return { state: 'checking', headline: 'Running the first frames…', fixes: [] }
  }

  if (detectionsSeen > 0) {
    return {
      state: 'pass',
      headline: 'Detection is working. Real model, real pixels, recognised objects.',
      fixes: [],
    }
  }

  if (framesRun < ENOUGH_FRAMES) {
    return { state: 'checking', headline: 'Running frames…', fixes: [] }
  }

  /*
   * Loaded, running, and recognising nothing. Deliberately *not* a failure: an empty
   * ceiling is a correct answer, and calling it broken would send a Teacher looking for a
   * fault that is not there.
   */
  return {
    state: 'inconclusive',
    headline: 'The model is running and has not recognised anything yet.',
    fixes: [
      'Point the camera at a person or a chair. Both are things this model knows.',
      'An empty wall producing no boxes is the model working, not failing.',
    ],
  }
}

/** What the Teacher reads about which model is loaded. Never blurs the two. */
export function detectorLabel(detector: ObjectDetector | null): string {
  if (detector === null) return 'Loading…'
  return detector.demo ? `${detector.displayName}, not a loaded model` : detector.displayName
}
