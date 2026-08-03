/**
 * Per-craft camera mirror and rotation — Teacher preference for this browser.
 *
 * Persisted in localStorage, never on Telemetry (stream URLs and orientation
 * alike stay off the wire). Not a Fleet Command (ADR-0011). The Integrator
 * applies `orientationTransform` as CSS on the video element.
 */

export const CAMERA_ORIENTATION_KEY = 'techtechflight:camera-orientation'

/** Clockwise degrees the picture is turned. */
export type CameraRotation = 0 | 90 | 180 | 270

export type CameraOrientation = {
  readonly mirror: boolean
  readonly rotation: CameraRotation
}

export type CameraOrientationMap = Readonly<Record<string, CameraOrientation>>

export const DEFAULT_ORIENTATION: CameraOrientation = Object.freeze({
  mirror: false,
  rotation: 0,
})

const EMPTY_MAP: CameraOrientationMap = Object.freeze({})

const listeners = new Set<() => void>()
let cachedMap: CameraOrientationMap | null = null

function invalidateCache(): void {
  cachedMap = null
}

function notifyListeners(): void {
  invalidateCache()
  for (const listener of listeners) listener()
}

export function subscribeCameraOrientation(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

function isRotation(value: unknown): value is CameraRotation {
  return value === 0 || value === 90 || value === 180 || value === 270
}

export function parseOrientationMap(raw: string): CameraOrientationMap {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    return EMPTY_MAP
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return EMPTY_MAP
  }

  const next: Record<string, CameraOrientation> = {}
  for (const [droneId, value] of Object.entries(parsed)) {
    if (typeof droneId !== 'string' || droneId.trim().length === 0) continue
    if (value === null || typeof value !== 'object' || Array.isArray(value)) continue
    const record = value as Record<string, unknown>
    const mirror = record['mirror'] === true
    const rotation = isRotation(record['rotation']) ? record['rotation'] : 0
    if (!mirror && rotation === 0) continue
    next[droneId.trim()] = Object.freeze({ mirror, rotation })
  }
  return Object.keys(next).length === 0 ? EMPTY_MAP : Object.freeze(next)
}

function readStoredMap(): CameraOrientationMap {
  if (typeof window === 'undefined') return EMPTY_MAP
  try {
    const raw = window.localStorage.getItem(CAMERA_ORIENTATION_KEY)
    if (raw === null) return EMPTY_MAP
    return parseOrientationMap(raw)
  } catch {
    return EMPTY_MAP
  }
}

/** Stable snapshot for useSyncExternalStore. */
export function getCameraOrientationMap(): CameraOrientationMap {
  if (cachedMap === null) cachedMap = readStoredMap()
  return cachedMap
}

/** Server cannot know the Teacher’s preference — empty until hydrate. */
export function readServerCameraOrientationMap(): CameraOrientationMap {
  return EMPTY_MAP
}

export function orientationFor(
  droneId: string,
  map: CameraOrientationMap = getCameraOrientationMap(),
): CameraOrientation {
  return map[droneId] ?? DEFAULT_ORIENTATION
}

function persist(map: CameraOrientationMap): void {
  cachedMap = map
  try {
    if (Object.keys(map).length === 0) {
      window.localStorage.removeItem(CAMERA_ORIENTATION_KEY)
    } else {
      window.localStorage.setItem(CAMERA_ORIENTATION_KEY, JSON.stringify(map))
    }
  } catch {
    // Locked-down school browser — keep the in-memory map for this session.
  }
  for (const listener of listeners) listener()
}

export function setCameraOrientation(
  droneId: string,
  next: CameraOrientation,
): void {
  const current = getCameraOrientationMap()
  const trimmed = droneId.trim()
  if (trimmed.length === 0) return

  const isDefault = !next.mirror && next.rotation === 0
  const record: Record<string, CameraOrientation> = { ...current }
  if (isDefault) {
    delete record[trimmed]
  } else {
    record[trimmed] = Object.freeze({
      mirror: next.mirror,
      rotation: next.rotation,
    })
  }
  const keys = Object.keys(record)
  persist(keys.length === 0 ? EMPTY_MAP : Object.freeze(record))
}

export function toggleMirror(droneId: string): void {
  const current = orientationFor(droneId)
  setCameraOrientation(droneId, {
    mirror: !current.mirror,
    rotation: current.rotation,
  })
}

export function rotateCamera(droneId: string, by: 90 | -90 = 90): void {
  const current = orientationFor(droneId)
  const next = (((current.rotation + by) % 360) + 360) % 360
  const rotation = (isRotation(next) ? next : 0) as CameraRotation
  setCameraOrientation(droneId, {
    mirror: current.mirror,
    rotation,
  })
}

/**
 * CSS transform the Integrator applies to the video / canvas.
 * Mirror first in local space, then rotate — matches common CCTV controls.
 */
export function orientationTransform(orientation: CameraOrientation): string {
  const parts: string[] = []
  if (orientation.mirror) parts.push('scaleX(-1)')
  if (orientation.rotation !== 0) parts.push(`rotate(${orientation.rotation}deg)`)
  return parts.length === 0 ? 'none' : parts.join(' ')
}

/** Tests only. */
export function resetCameraOrientationForTests(): void {
  cachedMap = EMPTY_MAP
  try {
    window.localStorage.removeItem(CAMERA_ORIENTATION_KEY)
  } catch {
    // ignore
  }
  notifyListeners()
}
