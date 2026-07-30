'use client'

import { useSyncExternalStore } from 'react'
import {
  getCameraRecordingSnapshot,
  isRecording,
  startRecordingAll,
  stopRecordingAll,
  subscribeCameraRecording,
} from '@/lib/camera-recording'
import { cn } from '@/lib/utils'

/**
 * Mark every listed Drone’s camera as recording — same session store as per-Drone Record.
 */
export function CameraRecordAllButton({
  droneIds,
  className,
}: {
  readonly droneIds: readonly string[]
  readonly className?: string
}) {
  const recording = useSyncExternalStore(
    subscribeCameraRecording,
    getCameraRecordingSnapshot,
    getCameraRecordingSnapshot,
  )
  const anyActive = droneIds.some((id) => isRecording(id, recording))

  return (
    <button
      type="button"
      disabled={droneIds.length === 0}
      aria-pressed={anyActive}
      onClick={() => {
        if (anyActive) stopRecordingAll(droneIds)
        else startRecordingAll(droneIds)
      }}
      className={cn(
        'min-h-11 cursor-pointer rounded-pill border px-4 py-1.5 text-value disabled:cursor-not-allowed disabled:opacity-50',
        anyActive
          ? 'border-status-fault bg-status-fault/10 text-status-fault'
          : 'border-hairline bg-transparent text-ink hover:border-ink',
        className,
      )}
    >
      {anyActive ? 'Stop all recordings' : 'Record all cameras'}
    </button>
  )
}
