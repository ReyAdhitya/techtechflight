'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { boardDetector } from '@/lib/board-detector'
import type { Detection, ObjectDetector } from '@/lib/object-detection'
import { detectorLabel, verdictFor, type Verdict } from '@/lib/detector-verdict'
import { runSelfTest, selfTestWords, type SelfTestResult } from '@/lib/detector-selftest'
import { lastDetectorError } from '@/lib/yolo-onnx-detector'
import { cn } from '@/lib/utils'
import { READING_FRAME } from '@/lib/frame'
import { DetectionBoxes } from './DetectionBoxes'
import type { AiServiceHealth } from '@/lib/http-yolo-detector'

/**
 * Does the camera and the detection model actually work on this machine?
 *
 * A check rather than a feature. Everywhere else the camera appears, detection is one part
 * of a Teacher's lesson; here it is the whole subject, and the screen's job is to answer
 * one question with a word — not to show boxes that look convincing whether or not a model
 * is loaded.
 *
 * That distinction is the reason this screen exists at all. `demoDetectionsFor` returns two
 * confident, stable, entirely invented boxes when the weights are missing, which is honest
 * on the camera pane because the pane says so beside them. On a *check*, showing them and
 * calling it working would be the exact failure the check is for. `detector-verdict.ts`
 * holds that judgement; this file is the surface over it.
 *
 * Two failures a Teacher will hit and neither is obvious:
 * - The weights are ~12 MB and deliberately not in the repository, so a fresh checkout has
 *   no model and silently falls back to the demo detector.
 * - Browsers refuse a camera on a plain http origin, so opening the board at the laptop's
 *   network address fails in a way that reads as a permissions problem and is not.
 * Both are named on screen with the thing to do about them.
 */

type CameraState = 'idle' | 'requesting' | 'live' | 'denied' | 'unavailable'

/**
 * How long to breathe between frames — *after* the previous one has finished, not a rate.
 *
 * Short, because the real limit is how long inference takes (most of a second, single
 * threaded), and the loop is self-scheduling so it can never run faster than the model.
 */
const FRAME_GAP_MS = 60

export function VisionCheckScreen() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [detector, setDetector] = useState<ObjectDetector | null>(null)
  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [detections, setDetections] = useState<readonly Detection[]>([])
  const [framesRun, setFramesRun] = useState(0)
  const [detectionsSeen, setDetectionsSeen] = useState(0)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [selfTest, setSelfTest] = useState<SelfTestResult | null>(null)
  const [selfTesting, setSelfTesting] = useState(false)
  const [frameError, setFrameError] = useState<string | null>(null)
  const [runsOn, setRunsOn] = useState('WebAssembly, in this browser')

  /*
   * `window.isSecureContext` is the browser's own answer to the question, rather than us
   * re-deriving it from the protocol and hostname and getting the localhost exception
   * wrong. Read once, after mount, so the static export renders the same on the server.
   */
  const [secureContext, setSecureContext] = useState(true)
  useEffect(() => {
    setSecureContext(typeof window === 'undefined' ? true : window.isSecureContext)
  }, [])

  useEffect(() => {
    let cancelled = false
    void boardDetector().then((loaded) => {
      if (cancelled) return
      setDetector(loaded)
      const health = (loaded as ObjectDetector & { aiHealth?: AiServiceHealth }).aiHealth
      if (health) {
        setRunsOn(
          health.device === 'cuda'
            ? 'AI service (CUDA)'
            : health.device === 'cpu'
              ? 'AI service (CPU)'
              : `AI service (${health.device})`,
        )
      } else {
        setRunsOn('WebAssembly, in this browser')
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraState('idle')
  }, [])

  const startCamera = useCallback(async () => {
    setCameraState('requesting')
    try {
      const media = navigator.mediaDevices
      if (!media?.getUserMedia) {
        setCameraState('unavailable')
        return
      }
      const stream = await media.getUserMedia({ video: true, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setCameraState('live')
    } catch (error) {
      /*
       * A refused camera and a machine without one arrive as different errors and need
       * different advice — "allow it" is useless to somebody with no webcam.
       */
      const name = (error as { name?: string } | null)?.name
      setCameraState(name === 'NotFoundError' ? 'unavailable' : 'denied')
    }
  }, [])

  // Tracks stay open until the Teacher leaves. A camera light left on is its own bug.
  useEffect(() => stopCamera, [stopCamera])

  useEffect(() => {
    if (!detector || cameraState !== 'live') return

    let stopped = false

    /*
     * One frame at a time, scheduled after the last one finished — not on a fixed timer.
     *
     * A single-threaded YOLOv8n frame takes the better part of a second on a normal
     * laptop. A 250 ms interval therefore queued three inferences for every one it
     * completed: memory climbed, the browser got slower, and the boxes drifted further
     * behind the picture every second. It read exactly like a model that could not see
     * anything, which is the worst possible way for a performance bug to present on a
     * screen whose entire job is to say whether the model works.
     */
    const runFrame = () => {
      const video = videoRef.current
      if (!video || stopped) return

      /*
       * A `<video>` reports 0×0 until it has metadata, and letterboxing a zero-sized
       * source draws nothing — so the first frames after Start would be scored against a
       * blank canvas and found, correctly, to contain nothing. Skipping them keeps the
       * "recognised so far" count honest.
       */
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        timer = window.setTimeout(runFrame, FRAME_GAP_MS)
        return
      }

      const startedAt = performance.now()
      void detector
        .detect({ surfaceId: 'vision-check', source: video })
        .then((found) => {
          if (stopped) return
          setLatencyMs(Math.round(performance.now() - startedAt))
          setDetections(found)
          setFramesRun((count) => count + 1)
          if (found.length > 0) setDetectionsSeen((count) => count + found.length)
          /*
           * A loaded model that fails every frame used to look like an empty room. Prefer
           * the detector's own last error; otherwise stay quiet when the room is genuinely empty.
           */
          setFrameError(lastDetectorError())
        })
        .catch((error: unknown) => {
          if (stopped) return
          const message = error instanceof Error ? error.message : String(error)
          setFrameError(message)
        })
        .finally(() => {
          // Only now is the next one scheduled. This is what stops the pile-up.
          if (!stopped) timer = window.setTimeout(runFrame, FRAME_GAP_MS)
        })
    }

    let timer = window.setTimeout(runFrame, 0)

    return () => {
      stopped = true
      window.clearTimeout(timer)
    }
  }, [detector, cameraState])

  const verdict = useMemo(
    () =>
      verdictFor({ detector, cameraState, secureContext, framesRun, detectionsSeen }),
    [detector, cameraState, secureContext, framesRun, detectionsSeen],
  )

  return (
    <main
      id="content"
      tabIndex={-1}
      className={cn(READING_FRAME, 'flex flex-col gap-8 p-4 min-[26rem]:p-8')}
    >
      <header className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-summary font-medium">Vision check</h1>
        <p className="m-0 max-w-[60ch] text-body text-ink-subtle">
          Whether this machine can see. Point the camera at something and read the answer —
          this screen tells you if detection is genuinely running, not just whether boxes
          appear.
        </p>
      </header>

      <VerdictPanel verdict={verdict} />

      <section className="flex flex-col gap-3">
        <h2 className="m-0 font-display text-section font-medium">
          Does the model run at all?
        </h2>
        <p className="m-0 max-w-[60ch] text-body text-ink-subtle">
          This needs no camera and no permission. It feeds the model one frame this page
          draws itself, and reports whether inference ran. Press it first if you are not
          sure whether the camera is the problem.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={selfTesting}
            onClick={() => {
              setSelfTesting(true)
              void runSelfTest()
                .then(setSelfTest)
                .finally(() => setSelfTesting(false))
            }}
            className="rounded-[12px] border border-hairline bg-surface-1 px-4 py-2 text-body font-medium disabled:opacity-60"
          >
            {selfTesting ? 'Running…' : 'Run a self-test'}
          </button>
          {selfTest && (
            <span
              className={cn(
                'text-body',
                selfTest.ok ? 'text-ink' : 'text-[color:var(--color-fault)]',
              )}
            >
              {selfTest.ok ? 'Passed' : 'Failed'} — {selfTestWords(selfTest)}
            </span>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="m-0 font-display text-section font-medium">Does it see people?</h2>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={cameraState === 'live' ? stopCamera : () => void startCamera()}
            className="rounded-[12px] border border-hairline bg-surface-1 px-4 py-2 text-body font-medium"
          >
            {cameraState === 'live' ? 'Stop the camera' : 'Start the camera'}
          </button>
          <span className="text-body text-ink-subtle">{cameraWords(cameraState)}</span>
        </div>

        <figure className="relative m-0 overflow-hidden rounded-[12px] border border-hairline bg-surface-1">
          <video
            ref={videoRef}
            muted
            playsInline
            aria-label="What the camera can see"
            className="block aspect-video w-full bg-canvas object-cover"
          />
          <DetectionOverlay detections={detections} demo={detector?.demo ?? false} />
        </figure>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="m-0 font-display text-section font-medium">What is running</h2>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
          <Row label="Model" value={detectorLabel(detector)} />
          <Row label="Runs on" value={runsOn} />
          <Row
            label="Frames checked"
            value={framesRun === 0 ? 'None yet' : String(framesRun)}
          />
          <Row
            label="Time per frame"
            /* A value that cannot be known is said in words, never drawn as a zero. */
            value={latencyMs === null ? 'Not measured yet' : `${latencyMs} ms`}
          />
          <Row
            label="Recognised so far"
            value={detectionsSeen === 0 ? 'Nothing yet' : String(detectionsSeen)}
          />
          <Row
            label="In this frame"
            value={
              detections.length === 0
                ? 'Nothing'
                : detections
                    .map((d) =>
                      d.trackId
                        ? `${d.label} #${d.trackId} ${Math.round(d.confidence * 100)}%`
                        : `${d.label} ${Math.round(d.confidence * 100)}%`,
                    )
                    .join(', ')
            }
          />
          {frameError ? <Row label="Last error" value={frameError} /> : null}
        </dl>
      </section>
    </main>
  )
}

function VerdictPanel({ verdict }: { verdict: Verdict }) {
  /*
   * Colour is never the sole carrier of meaning (ADR-0004), so the state is spelled out in
   * a word before anything is coloured, and the rail's shape differs too.
   */
  const tone =
    verdict.state === 'pass'
      ? 'border-l-4 border-l-[color:var(--color-ready)]'
      : verdict.state === 'fail'
        ? 'border-l-4 border-l-[color:var(--color-fault)]'
        : 'border-l-4 border-l-dashed border-l-hairline'

  return (
    <section
      // Assertive would interrupt a Teacher mid-read for a result they are already
      // watching for.
      aria-live="polite"
      className={cn(
        'flex flex-col gap-2 rounded-[12px] border border-hairline bg-surface-1 p-4',
        tone,
      )}
    >
      <p className="m-0 text-value font-medium">
        {verdictWord(verdict)} — {verdict.headline}
      </p>
      {verdict.fixes.length > 0 && (
        <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-body text-ink-subtle">
          {verdict.fixes.map((fix) => (
            <li key={fix}>{fix}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

function verdictWord(verdict: Verdict): string {
  switch (verdict.state) {
    case 'pass':
      return 'Working'
    case 'fail':
      return 'Not working'
    case 'inconclusive':
      return 'No answer yet'
    case 'checking':
      return 'Checking'
    case 'not-started':
      return 'Not started'
  }
}

function cameraWords(state: CameraState): string {
  switch (state) {
    case 'live':
      return 'The camera is on.'
    case 'requesting':
      return 'Asking the browser for the camera…'
    case 'denied':
      return 'The browser refused the camera.'
    case 'unavailable':
      return 'This machine reports no camera.'
    case 'idle':
      return 'The camera is off.'
  }
}

function DetectionOverlay({
  detections,
  demo,
}: {
  detections: readonly Detection[]
  demo: boolean
}) {
  return (
    <DetectionBoxes
      detections={detections}
      ariaLabel={
        demo
          ? `${detections.length} invented boxes from the demo detector, not a loaded model`
          : `${detections.length} recognised`
      }
    />
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="label self-center">{label}</dt>
      <dd className="m-0 text-value">{value}</dd>
    </>
  )
}
