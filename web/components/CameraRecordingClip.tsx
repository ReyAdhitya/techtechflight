'use client'

import { useSyncExternalStore } from 'react'
import {
  getCameraRecordingSnapshot,
  isRecording,
  startRecording,
  stopRecording,
  subscribeCameraRecording,
} from '@/lib/camera-recording'
import { cn } from '@/lib/utils'

/**
 * Mark this Drone’s camera as recording for the session.
 *
 * Local UI only — no Fleet message (ADR-0011). Bytes are not captured yet; the mark is
 * what Control, Walls, and this pane share so the Teacher can see who is clipped.
 */
export function CameraRecordingClip({
  droneId,
  className,
}: {
  readonly droneId: string
  readonly className?: string
}) {
  const recording = useSyncExternalStore(
    subscribeCameraRecording,
    getCameraRecordingSnapshot,
    getCameraRecordingSnapshot,
  )
  const active = isRecording(droneId, recording)

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={(event) => {
        event.stopPropagation()
        if (active) stopRecording(droneId)
        else startRecording(droneId)
      }}
      className={cn(
        'min-h-11 cursor-pointer rounded-pill border px-4 py-1.5 text-value',
        active
          ? 'border-status-fault bg-status-fault/10 text-status-fault'
          : 'border-hairline bg-transparent text-ink hover:border-ink',
        className,
      )}
    >
      {active ? 'Stop recording' : 'Record'}
    </button>
  )
}
