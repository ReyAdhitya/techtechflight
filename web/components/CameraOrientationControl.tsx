'use client'

import { useSyncExternalStore } from 'react'
import {
  getCameraOrientationMap,
  orientationFor,
  orientationTransform,
  readServerCameraOrientationMap,
  rotateCamera,
  subscribeCameraOrientation,
  toggleMirror,
} from '@/lib/camera-orientation'
import { cn } from '@/lib/utils'

/**
 * Mirror and rotate this craft’s camera picture.
 *
 * Mount in the Camera dialog (Integrator). Persist is localStorage; Integrator
 * applies `orientationTransform(orientationFor(droneId))` on the video.
 * Never a Fleet Command; never a stream URL on Telemetry (ADR-0011).
 */
export function CameraOrientationControl({
  droneId,
  className,
}: {
  readonly droneId: string
  readonly className?: string
}) {
  const map = useSyncExternalStore(
    subscribeCameraOrientation,
    getCameraOrientationMap,
    readServerCameraOrientationMap,
  )
  const orientation = orientationFor(droneId, map)
  const transform = orientationTransform(orientation)

  return (
    <div
      className={cn('flex flex-wrap items-center gap-2', className)}
      role="group"
      aria-label="Camera orientation"
    >
      <button
        type="button"
        aria-pressed={orientation.mirror}
        onClick={() => toggleMirror(droneId)}
        className={cn(
          'min-h-11 cursor-pointer rounded-pill border px-4 py-1.5 text-value',
          orientation.mirror
            ? 'border-ink bg-ink/5 text-ink'
            : 'border-hairline bg-transparent text-ink hover:border-ink',
        )}
      >
        {orientation.mirror ? 'Mirrored' : 'Mirror'}
      </button>
      <button
        type="button"
        onClick={() => rotateCamera(droneId, 90)}
        className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
      >
        Rotate 90°
      </button>
      <span className="tnum text-label text-ink-subtle" data-transform={transform}>
        {orientation.rotation}°
        {orientation.mirror ? ' · mirrored' : ''}
      </span>
    </div>
  )
}

/** Re-export for the Integrator applying CSS to the pane. */
export { orientationFor, orientationTransform }
