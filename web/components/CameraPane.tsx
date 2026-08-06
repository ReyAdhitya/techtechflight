'use client'

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from 'react'
import { CameraRecordingClip } from './CameraRecordingClip'
import type { CameraState } from '@techtechflight/contract'
import type { ScenarioControls } from '@/lib/fleet-link'
import { boardDetector } from '@/lib/board-detector'
import {
  readServerCameraStreamMap,
  resolveCameraStreamMap,
  streamUrlFor,
  subscribeCameraStreamMap,
} from '@/lib/camera-stream-map'
import {
  demoDetector,
  type Detection,
  type ObjectDetector,
} from '@/lib/object-detection'
import { createJsQrDecoder, type QrDecoder } from '@/lib/qr/decoder'
import {
  landingTargetPresentation,
  type LandingTarget,
} from '@/lib/qr/landing-target'
import {
  createUrlScanner,
  type LandingTargetScanner,
} from '@/lib/qr/scan-landing-target'
import { SIM_LANDING_QR_URL } from '@/lib/qr/sim-fixture'
import {
  getCameraOrientationMap,
  orientationFor,
  orientationTransform,
  readServerCameraOrientationMap,
  subscribeCameraOrientation,
} from '@/lib/camera-orientation'
import { createFrameClock } from '@/lib/frozen-feed'
import { cn } from '@/lib/utils'
import { FrozenFeedNotice } from './FrozenFeedNotice'
import { InstrumentPanel } from './FlightInstruments'
import { PhotoEvidenceButton } from './PhotoEvidenceButton'
import { DetectionBoxes } from './DetectionBoxes'

/** One decoder for the board — avoid allocating jsQR options every render. */
const defaultQrDecoder = createJsQrDecoder()

/**
 * What this Drone's camera is doing, as a surface a Teacher can look at.
 *
 * Telemetry may only say whether a camera is fitted and whether it is streaming
 * (`camera?: { streaming: boolean }`). A stream URL on that wire is an injection
 * surface (REQUIREMENTS) and must never appear here. School stream addresses live
 * in the Settings/env map. On a simulated Fleet the picture is an app-owned
 * placeholder; Start / Stop go through ScenarioControls, never as Commands (C9).
 * Land / Hover / Stop stay on Control — this pane is watch only.
 *
 * Object detection is app-side (pluggable `ObjectDetector`). Default loads
 * YOLOv8n ONNX in the browser; tests inject a mock. QR codes on the picture are
 * scanned for **landing targets** — never written into Telemetry. Sim may offer
 * an explicit "Place at landing pad (demo)" ScenarioControl.
 */
export function CameraPane({
  droneId,
  droneName,
  camera,
  scenarios,
  detector,
  qrDecoder = defaultQrDecoder,
  landingScanner,
}: {
  droneId: string
  droneName: string
  camera: CameraState | undefined
  scenarios: ScenarioControls | null
  /** Injected in tests. When omitted, the board loads YOLOv8n (demo fallback). */
  detector?: ObjectDetector
  /** Injected in tests; production uses jsQR. */
  qrDecoder?: QrDecoder
  /**
   * Injected scanner for jsdom tests. When omitted: sim + streaming scans the
   * static landing-pad fixture; no picture means no scanner.
   */
  landingScanner?: LandingTargetScanner | null
}) {
  const simulated = scenarios !== null
  const streamMap = useSyncExternalStore(
    subscribeCameraStreamMap,
    resolveCameraStreamMap,
    readServerCameraStreamMap,
  )
  const mappedUrl = streamUrlFor(droneId, streamMap)
  const hasPicture = camera?.streaming === true && simulated
  const landingTarget = useLandingTargetScan({
    hasPicture,
    qrDecoder,
    landingScanner,
  })

  if (camera === undefined) {
    return (
      <InstrumentPanel label="Camera">
        <p className="m-0 text-value text-ink-subtle">No camera fitted</p>
      </InstrumentPanel>
    )
  }

  return (
    <InstrumentPanel label="Camera">
      <div className="flex flex-col gap-3">
        {camera.streaming ? (
          simulated ? (
            <SimulatedFeed
              droneId={droneId}
              droneName={droneName}
              {...(detector !== undefined ? { detector } : {})}
            />
          ) : mappedUrl !== null ? (
            <SchoolStream droneId={droneId} droneName={droneName} src={mappedUrl} />
          ) : (
            <HardwareStreamingNotice />
          )
        ) : (
          <IdleSurface simulated={simulated} />
        )}

        {landingTarget && (
          <LandingTargetReadout
            droneId={droneId}
            target={landingTarget}
            scenarios={scenarios}
          />
        )}

        {/*
         * Record is camera-session chrome — it lives with the feed controls, not on
         * Control strips beside Camera. Always offered when a camera is fitted so the
         * Teacher does not have to Start first just to find Record.
         */}
        <div className="flex flex-wrap gap-2">
          <CameraRecordingClip droneId={droneId} />
          {simulated &&
            (camera.streaming ? (
              <button
                type="button"
                onClick={() => scenarios.stopCamera(droneId)}
                className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
              >
                Stop camera
              </button>
            ) : (
              <button
                type="button"
                onClick={() => scenarios.startCamera(droneId)}
                className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
              >
                Start camera
              </button>
            ))}
        </div>
      </div>
    </InstrumentPanel>
  )
}

function useLandingTargetScan({
  hasPicture,
  qrDecoder,
  landingScanner,
}: {
  hasPicture: boolean
  qrDecoder: QrDecoder
  landingScanner: LandingTargetScanner | null | undefined
}): LandingTarget | null {
  const [target, setTarget] = useState<LandingTarget | null>(null)

  useEffect(() => {
    // No picture → no scanner. Hardware streaming without a school map (#50) is
    // not a picture; idle sim is not a picture. Do not invent a scan either way.
    if (!hasPicture) {
      setTarget(null)
      return
    }

    const scanner =
      landingScanner !== undefined
        ? landingScanner
        : createUrlScanner(SIM_LANDING_QR_URL, qrDecoder)

    if (!scanner) {
      setTarget(null)
      return
    }

    let cancelled = false
    void scanner.scan().then((found) => {
      if (!cancelled) setTarget(found)
    })

    return () => {
      cancelled = true
    }
  }, [hasPicture, qrDecoder, landingScanner])

  return target
}

/**
 * Decoded landing pad on the camera surface.
 *
 * Pose write is opt-in and sim-only: the Teacher presses a labeled demo control,
 * which calls `ScenarioControls.setPosition`. Never auto-applied; never offered
 * when `scenarios` is null (hardware).
 */
function LandingTargetReadout({
  droneId,
  target,
  scenarios,
}: {
  droneId: string
  target: LandingTarget
  scenarios: ScenarioControls | null
}) {
  const { title, meaning } = landingTargetPresentation(target)

  return (
    <div
      className="flex flex-col gap-2 rounded-surface border border-hairline bg-surface-1 px-3 py-2"
      role="status"
      aria-label={title}
    >
      <p className="m-0 text-value text-ink">{title}</p>
      <p className="m-0 text-value text-ink-subtle">{meaning}</p>
      <p className="m-0 text-value text-ink-subtle">
        Decoded from the camera picture. Not written into Telemetry.
      </p>
      {scenarios && target.kind === 'pose' && (
        <button
          type="button"
          onClick={() => scenarios.setPosition(droneId, target.eastM, target.northM)}
          className="min-h-11 w-fit cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
        >
          Place at landing pad (demo)
        </button>
      )}
    </div>
  )
}

function IdleSurface({ simulated }: { simulated: boolean }) {
  return (
    <div
      className={cn(
        'flex aspect-video w-full items-center justify-center rounded-surface border border-dashed border-hairline bg-canvas px-4',
      )}
      role="img"
      aria-label="Camera fitted, not streaming"
    >
      <p className="m-0 text-center text-value text-ink-subtle">
        {simulated
          ? 'Fitted, not streaming. Start the simulated feed when you want a picture.'
          : 'Fitted, not streaming. This Fleet does not start a camera from the board.'}
      </p>
    </div>
  )
}

function HardwareStreamingNotice() {
  return (
    <div
      className="flex aspect-video w-full items-center justify-center rounded-surface border border-hairline bg-canvas px-4"
      role="status"
    >
      <p className="m-0 text-center text-value text-ink">
        Camera is streaming. A picture on this board needs a school stream map, not yet
        configured. Telemetry does not carry a URL.
      </p>
    </div>
  )
}

/**
 * Live school feed from the Settings/env map — never from Telemetry.
 */
function SchoolStream({ droneId, droneName, src }: { droneId: string; droneName: string; src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const orientationMap = useSyncExternalStore(
    subscribeCameraOrientation,
    getCameraOrientationMap,
    readServerCameraOrientationMap,
  )
  const transform = orientationTransform(orientationFor(droneId, orientationMap))
  const { lastFrameAt, streaming, now } = useFeedFrameClock(videoRef, true)

  return (
    <div className="relative overflow-hidden rounded-surface border border-hairline bg-ink">
      <video
        ref={videoRef}
        className="aspect-video w-full bg-ink"
        style={{ transform }}
        src={src}
        controls
        playsInline
        muted
        autoPlay
        aria-label={`Live camera stream for ${droneName}`}
      />
      <div className="pointer-events-none absolute inset-x-3 bottom-14 z-10">
        <FrozenFeedNotice lastFrameAt={lastFrameAt} now={now} streaming={streaming} />
      </div>
      <div className="flex flex-wrap gap-2 border-t border-hairline bg-surface-1 px-3 py-2">
        <PhotoEvidenceButton droneId={droneId} droneName={droneName} videoRef={videoRef} />
        <p className="m-0 self-center text-value text-ink-subtle">
          School stream · from the stream map, not Telemetry
        </p>
      </div>
    </div>
  )
}

/** Tick last-frame time from the video element for FrozenFeedNotice. */
function useFeedFrameClock(videoRef: RefObject<HTMLVideoElement | null>, streaming: boolean) {
  const clock = useRef(createFrameClock())
  const [lastFrameAt, setLastFrameAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!streaming) {
      clock.current.reset()
      setLastFrameAt(null)
      return
    }
    const video = videoRef.current
    if (!video) return
    const note = () => {
      clock.current.noteFrame()
      setLastFrameAt(clock.current.lastFrameAt())
    }
    note()
    video.addEventListener('timeupdate', note)
    const tick = window.setInterval(() => setNow(Date.now()), 500)
    return () => {
      video.removeEventListener('timeupdate', note)
      window.clearInterval(tick)
    }
  }, [streaming, videoRef])

  return { lastFrameAt, streaming, now }
}

/**
 * App-owned surface while the simulator says the camera is on.
 *
 * Prefers the laptop webcam so YOLOv8n has real pixels (person / objects). Falls
 * back to the labeled CSS sim + QR fixture if the browser denies the camera.
 * The school stream map is ignored while ScenarioControls are present.
 */
function SimulatedFeed({
  droneId,
  droneName,
  detector: injected,
}: {
  droneId: string
  droneName: string
  detector?: ObjectDetector
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [live, setLive] = useState(false)
  const [detector, setDetector] = useState<ObjectDetector>(injected ?? demoDetector)
  const orientationMap = useSyncExternalStore(
    subscribeCameraOrientation,
    getCameraOrientationMap,
    readServerCameraOrientationMap,
  )
  const transform = orientationTransform(orientationFor(droneId, orientationMap))
  const { lastFrameAt, streaming, now } = useFeedFrameClock(videoRef, live)

  useEffect(() => {
    if (injected) {
      setDetector(injected)
      return
    }
    let cancelled = false
    void boardDetector().then((d) => {
      if (!cancelled) setDetector(d)
    })
    return () => {
      cancelled = true
    }
  }, [injected])

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) return
    let stream: MediaStream | null = null
    let cancelled = false
    void navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream = s
        const el = videoRef.current
        if (el) {
          el.srcObject = s
          void el.play().then(() => setLive(true)).catch(() => setLive(false))
        }
      })
      .catch(() => setLive(false))
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const detections = useDetectionLoop(droneId, detector, videoRef)

  return (
    <div className="overflow-hidden rounded-surface border border-hairline bg-ink">
      <div className="relative aspect-video w-full bg-ink">
        <video
          ref={videoRef}
          className={cn(
            'absolute inset-0 h-full w-full object-cover',
            live ? 'opacity-100' : 'opacity-0',
          )}
          style={{ transform }}
          muted
          playsInline
          autoPlay
          aria-hidden={!live}
        />
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10">
          <FrozenFeedNotice lastFrameAt={lastFrameAt} now={now} streaming={streaming} />
        </div>
        {!live && (
          <div
            className="absolute inset-0 flex flex-col justify-between p-4"
            role="img"
            aria-label={`Simulated camera feed for ${droneName}`}
          >
            <div className="flex flex-col gap-1">
              <span className="label text-canvas">Simulated feed</span>
              <span className="text-value text-canvas/80">{droneName}</span>
            </div>
            <img
              src={SIM_LANDING_QR_URL}
              alt=""
              width={128}
              height={128}
              className="pointer-events-none absolute bottom-4 right-4 size-28 rounded-surface bg-canvas p-1"
            />
            <span className="text-value text-canvas/70">Not a live aircraft camera</span>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-1/3 h-8 animate-pulse bg-canvas/10"
            />
          </div>
        )}
        {live && (
          <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-0.5">
            <span className="label text-canvas">Live camera</span>
            <span className="text-value text-canvas/80">{droneName}</span>
          </div>
        )}
        <span className="sr-only">
          {live
            ? `Live camera feed for ${droneName}`
            : `Simulated camera feed for ${droneName}`}
        </span>
        <DetectionOverlay detections={detections} detector={detector} />
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-hairline bg-surface-1 px-3 py-2">
        <PhotoEvidenceButton
          droneId={droneId}
          droneName={droneName}
          videoRef={videoRef}
          hasLiveFrame={live}
        />
        <p className="m-0 text-value text-ink-subtle">
          {live
            ? 'Laptop camera. Detection runs in this browser, not on Telemetry'
            : 'Simulated feed. Not a live aircraft camera'}
          {detections.length > 0
            ? detector.demo
              ? ` · ${detector.displayName} (not a loaded model)`
              : ` · ${detector.displayName}`
            : null}
        </p>
      </div>
    </div>
  )
}

/**
 * Gap after a finished frame before starting the next one.
 *
 * Real YOLO is scheduled after the previous inference completes — never on a fixed
 * interval. A 250 ms timer used to queue three frames for every one that finished, which
 * made the boxes lag further behind every second and read as a model that could not see.
 */
const DETECTION_GAP_MS = 40
const DEMO_GAP_MS = 1000

function useDetectionLoop(
  surfaceId: string,
  detector: ObjectDetector,
  videoRef: RefObject<HTMLVideoElement | null>,
): readonly Detection[] {
  const [detections, setDetections] = useState<readonly Detection[]>([])

  useEffect(() => {
    let cancelled = false
    let timer = 0
    const gap = detector.demo ? DEMO_GAP_MS : DETECTION_GAP_MS

    const run = async () => {
      if (cancelled) return
      try {
        const video = videoRef.current
        const source =
          video && video.readyState >= 2 && video.videoWidth > 0 ? video : undefined
        const next = await detector.detect(
          source !== undefined ? { surfaceId, source } : { surfaceId },
        )
        if (!cancelled) setDetections(next)
      } catch {
        if (!cancelled) setDetections([])
      } finally {
        if (!cancelled) timer = window.setTimeout(() => void run(), gap)
      }
    }

    void run()

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [surfaceId, detector, videoRef])

  return detections
}

function DetectionOverlay({
  detections,
  detector,
}: {
  detections: readonly Detection[]
  detector: ObjectDetector
}) {
  return (
    <DetectionBoxes
      detections={detections}
      ariaLabel={
        detector.demo
          ? `Demo detections from ${detector.displayName}`
          : `Detections from ${detector.displayName}`
      }
    />
  )
}
