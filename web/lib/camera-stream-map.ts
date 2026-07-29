/**
 * School camera stream map: droneId → stream URL.
 *
 * Lives outside Telemetry on purpose (REQUIREMENTS). Telemetry may only say
 * `camera.streaming`; the picture address is school configuration — Settings
 * (localStorage) with an optional build-time seed from
 * `NEXT_PUBLIC_CAMERA_STREAM_MAP`. Values are sanitized to http(s) only so a
 * map entry cannot become a script injection surface.
 */

export const CAMERA_STREAM_MAP_KEY = 'techtechflight:camera-stream-map'

export type CameraStreamMap = Readonly<Record<string, string>>

const EMPTY_MAP: CameraStreamMap = Object.freeze({})

const listeners = new Set<() => void>()

/**
 * Stable snapshot for useSyncExternalStore — a fresh object every read would
 * fail Object.is and re-render forever.
 */
let cachedMap: CameraStreamMap | null = null

function invalidateCache(): void {
  cachedMap = null
}

function notifyListeners(): void {
  invalidateCache()
  listeners.forEach((notify) => notify())
}

/**
 * Accept only absolute http(s) URLs with no embedded credentials.
 * Rejects javascript:, data:, blob:, and relative paths.
 */
export function sanitizeStreamUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (url.username !== '' || url.password !== '') return null

  return url.href
}

/**
 * Parse a JSON object of droneId → URL. Unknown shapes and bad URLs are dropped,
 * not thrown — a half-broken school env must not take down the board.
 */
export function parseCameraStreamMapJson(raw: string): CameraStreamMap {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    return EMPTY_MAP
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return EMPTY_MAP
  }

  const next: Record<string, string> = {}
  for (const [droneId, value] of Object.entries(parsed)) {
    if (typeof droneId !== 'string' || droneId.trim().length === 0) continue
    if (typeof value !== 'string') continue
    const url = sanitizeStreamUrl(value)
    if (url === null) continue
    next[droneId.trim()] = url
  }
  return Object.keys(next).length === 0 ? EMPTY_MAP : next
}

export function readEnvCameraStreamMap(): CameraStreamMap {
  const raw = process.env.NEXT_PUBLIC_CAMERA_STREAM_MAP
  if (raw === undefined || raw.trim().length === 0) return EMPTY_MAP
  return parseCameraStreamMapJson(raw)
}

export function readStoredCameraStreamMap(): CameraStreamMap | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CAMERA_STREAM_MAP_KEY)
    if (raw === null) return null
    return parseCameraStreamMapJson(raw)
  } catch {
    return null
  }
}

/** Stable boolean for useSyncExternalStore — unlike a parsed object map. */
export function hasStoredCameraStreamMap(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(CAMERA_STREAM_MAP_KEY) !== null
  } catch {
    return false
  }
}

/**
 * Teacher Settings wins when present; otherwise the deploy-time env seed.
 * An empty stored object still wins — clearing the map is a deliberate choice.
 */
export function resolveCameraStreamMap(): CameraStreamMap {
  if (cachedMap !== null) return cachedMap
  const stored = readStoredCameraStreamMap()
  cachedMap = stored !== null ? stored : readEnvCameraStreamMap()
  return cachedMap
}

export function streamUrlFor(
  droneId: string,
  map: CameraStreamMap = resolveCameraStreamMap(),
): string | null {
  const url = map[droneId]
  if (url === undefined) return null
  return sanitizeStreamUrl(url)
}

export function writeCameraStreamMap(map: CameraStreamMap): void {
  const cleaned = parseCameraStreamMapJson(JSON.stringify(map))
  try {
    window.localStorage.setItem(CAMERA_STREAM_MAP_KEY, JSON.stringify(cleaned))
  } catch {
    // Locked-down school browsers can refuse storage; callers still get the notify.
  }
  notifyListeners()
}

export function clearStoredCameraStreamMap(): void {
  try {
    window.localStorage.removeItem(CAMERA_STREAM_MAP_KEY)
  } catch {
    // Same as write — memory of the choice is what is lost.
  }
  notifyListeners()
}

export function subscribeCameraStreamMap(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

/** Server / first paint: empty. Client snapshot fills from storage or env. */
export function readServerCameraStreamMap(): CameraStreamMap {
  return EMPTY_MAP
}
