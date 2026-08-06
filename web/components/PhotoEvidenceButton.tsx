'use client'

import type { RefObject } from 'react'
import {
  downloadPhotoFromVideo,
  downloadPlaceholderEvidence,
} from '@/lib/photo-evidence'

/**
 * Save a still from the camera picture — download only, no Fleet message (ADR-0011).
 */
export function PhotoEvidenceButton({
  droneId,
  droneName,
  videoRef,
  hasLiveFrame,
}: {
  readonly droneId: string
  readonly droneName: string
  readonly videoRef?: RefObject<HTMLVideoElement | null>
  readonly hasLiveFrame?: boolean
}) {
  const filename = `${droneId}-evidence.png`

  const save = () => {
    const video = videoRef?.current
    if (video && downloadPhotoFromVideo(video, filename)) return
    downloadPlaceholderEvidence(`${droneName}, ${droneId}`, filename)
  }

  return (
    <button
      type="button"
      onClick={save}
      className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
    >
      {hasLiveFrame === false ? 'Save sim frame' : 'Save photo evidence'}
    </button>
  )
}
