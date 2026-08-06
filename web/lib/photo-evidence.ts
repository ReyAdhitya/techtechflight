/**
 * Capture a still from a camera video element and download it — browser only (ADR-0011).
 */
export function downloadPhotoFromVideo(
  video: HTMLVideoElement,
  filename: string,
): boolean {
  if (video.videoWidth === 0 || video.videoHeight === 0) return false
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (ctx === null) return false
  ctx.drawImage(video, 0, 0)
  triggerDownload(canvas.toDataURL('image/png'), filename)
  return true
}

/** Fallback when there is no live frame — labels the sim surface honestly. */
export function downloadPlaceholderEvidence(label: string, filename: string): void {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 360
  const ctx = canvas.getContext('2d')
  if (ctx === null) return
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#f5f0e8'
  ctx.font = '24px sans-serif'
  ctx.fillText(label, 24, 48)
  ctx.font = '16px sans-serif'
  ctx.fillText('Simulated feed, not a live aircraft camera', 24, 80)
  triggerDownload(canvas.toDataURL('image/png'), filename)
}

function triggerDownload(dataUrl: string, filename: string): void {
  const anchor = document.createElement('a')
  anchor.href = dataUrl
  anchor.download = filename
  anchor.click()
}
