'use client'

import { useEffect, useState } from 'react'
import type { CameraState } from '@techtechflight/contract'
import type { ScenarioControls } from '@/lib/fleet-link'
import {
  demoDetector,
  type Detection,
  type ObjectDetector,
} from '@/lib/object-detection'
import { cn } from '@/lib/utils'
import { InstrumentPanel } from './FlightInstruments'

/**
 * What this Drone's camera is doing, as a surface a Teacher can look at.
 *
 * Telemetry may only say whether a camera is fitted and whether it is streaming
 * (`camera?: { streaming: boolean }`). A stream URL on that wire is an injection
 * surface (REQUIREMENTS) and must never appear here. On a simulated Fleet the
 * picture is an app-owned placeholder; Start / Stop go through ScenarioControls,
 * never as Commands (C9). Land / Hover / Stop stay on Control — this pane is watch
 * only.
 *
 * Object detection is app-side on this pane (pluggable `ObjectDetector`). It does
 * not travel on Telemetry. The default is a labeled demo detector — not YOLOv12
 * until weights are loaded (docs/DECISIONS.md).
 */
export function CameraPane({
  droneId,
  droneName,
  camera,
  scenarios,
  detector = demoDetector,
}: {
  droneId: string
  droneName: string
  camera: CameraState | undefined
  scenarios: ScenarioControls | null
  detector?: ObjectDetector
}) {
  const simulated = scenarios !== null

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
          ) : (
            <HardwareStreamingNotice />
          )
        ) : (
          <IdleSurface simulated={simulated} />
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
 * App-owned pixels while the simulator says the camera is on.
 *
 * Deliberately labeled and generated here — never from a Telemetry field — so a
 * demonstration cannot be mistaken for a live aircraft camera. CSS rather than
 * `<canvas>`: jsdom has no drawing surface, and the label is what makes the feed honest.
 *
 * Detection overlays sit as a sibling of the `role="img"` picture (not a child) so
 * assistive tech and tests can still find the list. Failures stay quiet.
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
          <span className="text-value text-canvas/70">Not a live aircraft camera</span>
          {/*
           * A slow sweep so the pane looks alive without claiming frames from an airframe.
           */}
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

/**
 * Runs the detector on an interval while the simulated feed is mounted.
 *
 * Rejects and throws collapse to an empty list — quiet idle, no crash. The
 * interval is the overlay loop the acceptance criteria ask for; real models can
 * replace `detect` without changing this hook.
 */
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
