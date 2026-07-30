'use client'
export function CameraRecordingClip({ onClip }: { onClip: () => void }) {
  return (<button type="button" className="min-h-11 rounded-pill border border-hairline px-3 py-1.5 text-caption text-ink" onClick={onClip}>Save clip</button>)
}
