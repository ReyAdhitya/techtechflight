'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { CameraState } from '@techtechflight/contract'
import { useFleet } from '@/components/FleetProvider'
import { boardDetector } from '@/lib/board-detector'
import type { ScenarioControls } from '@/lib/fleet-link'
import { demoDetector, type ObjectDetector } from '@/lib/object-detection'
import {
  canRunWallDetection,
  detectWallSummary,
  detectionCountFromDetections,
  formatDetectionCount,
  hasReadyPixelSource,
} from './detect-wall'
import { WallGrid, WallTile } from './WallGrid'

function useWallPixelSource(needed: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [pixelsReady, setPixelsReady] = useState(false)

  useEffect(() => {
    if (!needed) {
      setPixelsReady(false)
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) return

    let stream: MediaStream | null = null
    let cancelled = false

    void navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((media) => {
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop())
          return
        }
        stream = media
        const video = videoRef.current
        if (!video) return
        video.srcObject = media
        void video.play().catch(() => {})
      })
      .catch(() => {
        if (!cancelled) setPixelsReady(false)
      })

    return () => {
      cancelled = true
      stream?.getTracks().forEach((track) => track.stop())
      if (videoRef.current) videoRef.current.srcObject = null
      setPixelsReady(false)
    }
  }, [needed])

  useEffect(() => {
    if (!needed) return
    const video = videoRef.current
    if (!video) return

    const note = () => {
      setPixelsReady(hasReadyPixelSource(video))
    }

    note()
    video.addEventListener('loadeddata', note)
    video.addEventListener('resize', note)
    return () => {
      video.removeEventListener('loadeddata', note)
      video.removeEventListener('resize', note)
    }
  }, [needed])

  return { videoRef, pixelsReady }
}

function useWallDetectionCount(
  surfaceId: string,
  detector: ObjectDetector,
  enabled: boolean,
  videoRef: RefObject<HTMLVideoElement | null>,
  pixelsReady: boolean,
): number | null {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    if (!enabled) {
      setCount(null)
      return
    }

    let cancelled = false

    const run = async () => {
      const video = videoRef.current
      const source =
        pixelsReady && video && hasReadyPixelSource(video) ? video : undefined
      if (source === undefined) {
        if (!cancelled) setCount(null)
        return
      }

      try {
        const found = await detector.detect({ surfaceId, source })
        if (!cancelled) {
          setCount(detectionCountFromDetections(found, true))
        }
      } catch {
        if (!cancelled) setCount(null)
      }
    }

    void run()
    const timer = window.setInterval(() => {
      void run()
    }, detector.demo ? 1000 : 250)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [surfaceId, detector, enabled, videoRef, pixelsReady])

  return enabled ? count : null
}

function DetectWallTile({
  droneId,
  callsign,
  camera,
  scenarios,
  detector,
  videoRef,
  pixelsReady,
  onCount,
}: {
  droneId: string
  callsign: string
  camera: CameraState | undefined
  scenarios: ScenarioControls | null
  detector: ObjectDetector
  videoRef: RefObject<HTMLVideoElement | null>
  pixelsReady: boolean
  onCount: (droneId: string, count: number | null) => void
}) {
  const enabled = canRunWallDetection(camera, scenarios, detector)
  const count = useWallDetectionCount(droneId, detector, enabled, videoRef, pixelsReady)

  useEffect(() => {
    onCount(droneId, enabled ? count : null)
  }, [droneId, count, enabled, onCount])

  const readout = enabled ? formatDetectionCount(count) : formatDetectionCount(null)

  return (
    <WallTile className="relative p-0">
      <Link
        href={`/drone?id=${encodeURIComponent(droneId)}`}
        prefetch={false}
        className="flex min-h-[6rem] flex-col gap-2 rounded-sm p-3 text-inherit no-underline hover:text-inherit focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <p className="m-0 font-display text-body font-medium text-ink">{callsign}</p>
        <p className="tnum m-0 font-display text-summary font-medium text-ink">{readout}</p>
      </Link>
    </WallTile>
  )
}

/**
 * YOLO detection counts across the class — one tally per Drone, read-only.
 *
 * Runs the same in-browser detector as CameraPane when a sim camera is streaming and the
 * detector exposes counts; otherwise the tile says it cannot count. Tap through to Drone detail.
 */
export function DetectWall({
  emptyLabel = 'Waiting for the Fleet.',
  detector: injectedDetector,
}: {
  emptyLabel?: string
  /** Injected in tests. When omitted, the board loads YOLOv8n (demo fallback). */
  detector?: ObjectDetector
}) {
  const { snapshot, vitals, scenarios } = useFleet()
  const drones = snapshot.state?.drones
  const [detector, setDetector] = useState<ObjectDetector>(injectedDetector ?? demoDetector)
  const [countsByDrone, setCountsByDrone] = useState<Record<string, number | null>>({})

  useEffect(() => {
    if (injectedDetector !== undefined) {
      setDetector(injectedDetector)
      return
    }
    let cancelled = false
    void boardDetector().then((loaded) => {
      if (!cancelled) setDetector(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [injectedDetector])

  const handleCount = useCallback((droneId: string, count: number | null) => {
    setCountsByDrone((prev) => (prev[droneId] === count ? prev : { ...prev, [droneId]: count }))
  }, [])

  const anyStreamingSim = vitals.some((entry) => {
    const drone = drones?.find((d) => d.id === entry.droneId)
    return canRunWallDetection(drone?.telemetry?.camera, scenarios, detector)
  })

  const { videoRef, pixelsReady } = useWallPixelSource(anyStreamingSim)

  if (!drones || drones.length === 0) {
    return <p className="m-0 text-body text-ink-muted">{emptyLabel}</p>
  }

  const summary = detectWallSummary(vitals.map((entry) => countsByDrone[entry.droneId] ?? null))

  return (
    <div className="flex flex-col gap-4">
      <video ref={videoRef} muted playsInline autoPlay className="sr-only" aria-hidden />
      <p className="m-0 font-display text-summary font-medium text-ink">
        {summary === null ? (
          <>No detection tallies yet</>
        ) : (
          <>
            <span className="tnum">{summary}</span>
            {summary === 1 ? ' object' : ' objects'}
          </>
        )}
      </p>
      <WallGrid>
        {vitals.map((entry) => {
          const drone = drones.find((d) => d.id === entry.droneId)
          return (
            <DetectWallTile
              key={entry.droneId}
              droneId={entry.droneId}
              callsign={entry.callsign}
              camera={drone?.telemetry?.camera}
              scenarios={scenarios}
              detector={detector}
              videoRef={videoRef}
              pixelsReady={pixelsReady}
              onCount={handleCount}
            />
          )
        })}
      </WallGrid>
    </div>
  )
}
