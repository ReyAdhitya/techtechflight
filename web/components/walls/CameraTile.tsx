'use client'

import { useSyncExternalStore } from 'react'
import type { CameraState, DroneState } from '@techtechflight/contract'
import type { ScenarioControls } from '@/lib/fleet-link'
import {
  readServerCameraStreamMap,
  resolveCameraStreamMap,
  streamUrlFor,
  subscribeCameraStreamMap,
} from '@/lib/camera-stream-map'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/StatusBadge'

const SURFACE =
  'flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-surface border border-hairline bg-canvas px-3 py-2 text-center'

/**
 * Compact watch-only camera surface for a Classroom Wall tile.
 *
 * Shares stream-map and sim/hardware rules with CameraPane — no Telemetry URLs, no
 * YOLO/QR, no Start/Stop on the tile (those stay in CameraSlide's CameraPane).
 */
export function CameraTile({
  droneId,
  droneName,
  drone,
  camera,
  scenarios,
}: {
  droneId: string
  droneName: string
  drone: DroneState
  camera: CameraState | undefined
  scenarios: ScenarioControls | null
}) {
  const simulated = scenarios !== null
  const streamMap = useSyncExternalStore(
    subscribeCameraStreamMap,
    resolveCameraStreamMap,
    readServerCameraStreamMap,
  )
  const mappedUrl = streamUrlFor(droneId, streamMap)

  const noResponseYet = drone.lastContact === null
  const offline = drone.status === 'Offline'

  if (!drone.telemetry || offline) {
    return (
      <div className={cn(SURFACE, offline && 'text-ink-muted')}>
        <StatusBadge status={drone.status} />
        <p className="m-0 text-value text-inherit">
          {!drone.telemetry
            ? 'No Telemetry yet'
            : noResponseYet
              ? 'No response yet'
              : null}
        </p>
      </div>
    )
  }

  if (camera === undefined) {
    return (
      <div className={SURFACE}>
        <p className="m-0 text-value text-ink-subtle">No camera fitted</p>
      </div>
    )
  }

  if (!camera.streaming) {
    return (
      <div className={SURFACE} role="img" aria-label="Camera fitted, not streaming">
        <p className="m-0 text-value text-ink-subtle">
          {simulated
            ? 'Fitted, not streaming. Start the simulated feed when you want a picture.'
            : 'Fitted, not streaming. This Fleet does not start a camera from the board.'}
        </p>
      </div>
    )
  }

  if (simulated) {
    return (
      <div
        className="overflow-hidden rounded-surface border border-hairline bg-ink"
        role="img"
        aria-label={`Simulated camera feed for ${droneName}`}
      >
        <div className="relative flex aspect-video w-full flex-col justify-between p-3">
          <div className="flex flex-col gap-0.5">
            <span className="label text-canvas">Simulated feed</span>
            <span className="text-value text-canvas/80">{droneName}</span>
          </div>
          <span className="text-value text-canvas/70">Not a live aircraft camera</span>
        </div>
      </div>
    )
  }

  if (mappedUrl !== null) {
    return (
      <div className="overflow-hidden rounded-surface border border-hairline bg-ink">
        <video
          className="aspect-video w-full bg-ink"
          src={mappedUrl}
          playsInline
          muted
          autoPlay
          aria-label={`Live camera stream for ${droneName}`}
        />
      </div>
    )
  }

  return (
    <div className={SURFACE} role="status">
      <p className="m-0 text-value text-ink">
        Camera is streaming. A picture on this board needs a school stream map — not yet
        configured. Telemetry does not carry a URL.
      </p>
    </div>
  )
}
