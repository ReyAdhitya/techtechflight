'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import type { CameraState } from '@techtechflight/contract'
import type { ScenarioControls } from '@/lib/fleet-link'
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
import { cn } from '@/lib/utils'
import { InstrumentPanel } from './FlightInstruments'

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
 * Object detection is app-side (pluggable `ObjectDetector`). QR codes on the
 * picture are scanned for **landing targets** — never written into Telemetry.
 * Sim may offer an explicit "Place at landing pad (demo)" ScenarioControl.
 */
export function CameraPane({
  droneId,
  droneName,
  camera,
  scenarios,
  detector = demoDetector,
  qrDecoder = defaultQrDecoder,
  landingScanner,
}: {
  droneId: string
  droneName: string
  camera: CameraState | undefined
  scenarios: ScenarioControls | null
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
            <SimulatedFeed droneId={droneId} droneName={droneName} detector={detector} />
          ) : mappedUrl !== null ? (
            <SchoolStream droneName={droneName} src={mappedUrl} />
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

        {simulated && (
          <div className="flex flex-wrap gap-2">
            {camera.streaming ? (
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
            )}
          </div>
        )}
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
        Decoded from the camera picture — not written into Telemetry.
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
        Camera is streaming. A picture on this board needs a school stream map — not yet
        configured. Telemetry does not carry a URL.
      </p>
    </div>
  )
}

/**
 * Live school feed from the Settings/env map — never from Telemetry.
 */
function SchoolStream({ droneName, src }: { droneName: string; src: string }) {
  return (
    <div className="overflow-hidden rounded-surface border border-hairline bg-ink">
      <video
        className="aspect-video w-full bg-ink"
        src={src}
        controls
        playsInline
        muted
        autoPlay
        aria-label={`Live camera stream for ${droneName}`}
      />
      <p className="m-0 border-t border-hairline bg-surface-1 px-3 py-2 text-value text-ink-subtle">
        School stream — from the stream map, not Telemetry
      </p>
    </div>
  )
}

/**
 * App-owned pixels while the simulator says the camera is on.
 *
 * Includes the static landing-pad QR fixture and optional detection overlay.
 * The school stream map is ignored while ScenarioControls are present.
 */
function SimulatedFeed({
  droneId,
  droneName,
  detector,
}: {
  droneId: string
  droneName: string
  detector: ObjectDetector
}) {
  const detections = useDetectionLoop(droneId, detector)

  return (
    <div className="overflow-hidden rounded-surface border border-hairline bg-ink">
      <div className="relative aspect-video w-full bg-ink">
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
        <DetectionOverlay detections={detections} detector={detector} />
      </div>
      <p className="m-0 border-t border-hairline bg-surface-1 px-3 py-2 text-value text-ink-subtle">
        Simulated feed — not a live aircraft camera
        {detections.length > 0
          ? detector.demo
            ? ` · ${detector.displayName} (not a loaded model)`
            : ` · ${detector.displayName}`
          : null}
      </p>
    </div>
  )
}

function useDetectionLoop(surfaceId: string, detector: ObjectDetector): readonly Detection[] {
  const [detections, setDetections] = useState<readonly Detection[]>([])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const next = await detector.detect({ surfaceId })
        if (!cancelled) setDetections(next)
      } catch {
        if (!cancelled) setDetections([])
      }
    }

    void run()
    const timer = window.setInterval(() => {
      void run()
    }, 1000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [surfaceId, detector])

  return detections
}

function DetectionOverlay({
  detections,
  detector,
}: {
  detections: readonly Detection[]
  detector: ObjectDetector
}) {
  if (detections.length === 0) return null

  return (
    <ul
      className="pointer-events-none absolute inset-0 m-0 list-none p-0"
      aria-label={
        detector.demo
          ? `Demo detections from ${detector.displayName}`
          : `Detections from ${detector.displayName}`
      }
    >
      {detections.map((detection) => (
        <li
          key={detection.id}
          className="absolute border-2 border-canvas"
          style={{
            left: `${detection.box.x * 100}%`,
            top: `${detection.box.y * 100}%`,
            width: `${detection.box.width * 100}%`,
            height: `${detection.box.height * 100}%`,
          }}
          data-detection-label={detection.label}
        >
          <span className="absolute bottom-full left-0 mb-0.5 bg-ink/80 px-1 text-value text-canvas">
            {detection.label}{' '}
            <span className="tnum text-canvas/80">
              {Math.round(detection.confidence * 100)}%
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}
