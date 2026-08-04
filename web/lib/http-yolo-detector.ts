/**
 * ObjectDetector that scores frames on the local AI service (YOLO11x).
 *
 * The board stays static-export friendly: when the service is down or the URL is unset,
 * `boardDetector()` keeps today's wasm / demo path. Detections never ride Telemetry.
 */

import type { Detection, DetectionFrame, ObjectDetector } from './object-detection.ts'

export const AI_DETECT_URL_KEY = 'techtechflight:ai-detect-url'
export const DEFAULT_AI_DETECT_URL = 'http://127.0.0.1:8090'

export interface AiServiceHealth {
  readonly status: string
  readonly device: string
  readonly model_id: string
  readonly imgsz: number
  readonly tracker?: string
}

export interface AiDetectResponse {
  readonly detections: readonly {
    readonly id: string
    readonly label: string
    readonly confidence: number
    readonly box: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
    readonly track_id?: string | null
  }[]
  readonly ts: number
  readonly model_id: string
  readonly device: string
}

/**
 * Build URL from localStorage, then env, then the classroom default.
 *
 * Always returning a candidate lets `boardDetector()` probe `:8090` when the launcher
 * started the AI service — if `/health` fails quickly, wasm/demo takes over.
 */
export function resolveAiDetectUrl(): string {
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(AI_DETECT_URL_KEY)
      if (stored && stored.trim()) return stored.trim().replace(/\/$/, '')
    } catch {
      // private mode
    }
  }
  const fromEnv =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_AI_DETECT_URL?.trim() : undefined
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  return DEFAULT_AI_DETECT_URL
}

export async function fetchAiHealth(baseUrl: string): Promise<AiServiceHealth | null> {
  try {
    const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(800) })
    if (!res.ok) return null
    return (await res.json()) as AiServiceHealth
  } catch {
    return null
  }
}

function isImageData(source: CanvasImageSource | ImageData): source is ImageData {
  return (
    typeof ImageData !== 'undefined' &&
    source instanceof ImageData
  )
}

function frameToBlob(source: CanvasImageSource | ImageData): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  let w = 640
  let h = 480
  if (isImageData(source)) {
    w = source.width
    h = source.height
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')?.putImageData(source, 0, 0)
  } else {
    w =
      'videoWidth' in source && source.videoWidth
        ? source.videoWidth
        : 'naturalWidth' in source && source.naturalWidth
          ? source.naturalWidth
          : 'width' in source && typeof source.width === 'number'
            ? source.width
            : 640
    h =
      'videoHeight' in source && source.videoHeight
        ? source.videoHeight
        : 'naturalHeight' in source && source.naturalHeight
          ? source.naturalHeight
          : 'height' in source && typeof source.height === 'number'
            ? source.height
            : 480
    if (w <= 0 || h <= 0) return Promise.resolve(null)
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')?.drawImage(source as CanvasImageSource, 0, 0, w, h)
  }
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85)
  })
}

export interface HttpYoloDetector extends ObjectDetector {
  readonly aiHealth: AiServiceHealth
  readonly baseUrl: string
}

/** Null when the service is unreachable. */
export async function createHttpYoloDetector(
  baseUrl: string,
): Promise<HttpYoloDetector | null> {
  const health = await fetchAiHealth(baseUrl)
  if (!health || health.status !== 'ok') return null

  return {
    displayName: health.model_id || 'YOLO11x',
    demo: false,
    aiHealth: health,
    baseUrl,
    async detect(frame: DetectionFrame): Promise<readonly Detection[]> {
      const source = frame.source
      if (!source) return []
      const blob = await frameToBlob(source)
      if (!blob) return []

      const body = new FormData()
      body.append('file', blob, 'frame.jpg')

      const res = await fetch(`${baseUrl}/detect`, {
        method: 'POST',
        body,
        signal: AbortSignal.timeout(30_000),
      })
      if (!res.ok) throw new Error(`AI service detect failed (${res.status})`)
      const json = (await res.json()) as AiDetectResponse
      return json.detections.map((d) => ({
        id: d.id,
        label: d.label,
        confidence: d.confidence,
        box: d.box,
        trackId: d.track_id ?? null,
      }))
    },
  }
}
