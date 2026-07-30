'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { CameraState } from '@techtechflight/contract'
import { useFleet } from '@/components/FleetProvider'
import { boardDetector } from '@/lib/board-detector'
import type { ScenarioControls } from '@/lib/fleet-link'
import { demoDetector, type ObjectDetector } from '@/lib/object-detection'
import {
  canRunWallDetection,
  detectWallSummary,
  formatDetectionCount,
} from './detect-wall'
import { WallGrid, WallTile } from './WallGrid'

function useWallDetectionCount(
  surfaceId: string,
  detector: ObjectDetector,
  enabled: boolean,
): number | null {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    if (!enabled) {
      setCount(null)
      return
    }

    let cancelled = false

    const run = async () => {
      try {
        const found = await detector.detect({ surfaceId })
        if (!cancelled) setCount(found.length)
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
  }, [surfaceId, detector, enabled])

  return enabled ? count : null
}

function DetectWallTile({
  droneId,
  callsign,
  camera,
  scenarios,
  detector,
  onCount,
}: {
  droneId: string
  callsign: string
  camera: CameraState | undefined
  scenarios: ScenarioControls | null
  detector: ObjectDetector
  onCount: (droneId: string, count: number | null) => void
}) {
  const enabled = canRunWallDetection(camera, scenarios, detector)
  const count = useWallDetectionCount(droneId, detector, enabled)

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
 * detector exposes counts; otherwise the tile shows unavailable. Tap through to Drone detail.
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

  if (!drones || drones.length === 0) {
    return <p className="m-0 text-body text-ink-muted">{emptyLabel}</p>
  }

  const summary = detectWallSummary(vitals.map((entry) => countsByDrone[entry.droneId] ?? null))

  return (
    <div className="flex flex-col gap-4">
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
              onCount={handleCount}
            />
          )
        })}
      </WallGrid>
    </div>
  )
}
