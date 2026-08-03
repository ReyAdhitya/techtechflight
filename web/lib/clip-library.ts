/**
 * Session-local library of camera clips the Teacher already captured.
 *
 * In-memory for this tab only — not Telemetry, not a Fleet Command (ADR-0011).
 * Feature 101 writes real bytes; this library only remembers them so Control /
 * the Camera dialog can list and re-download without asking the craft again.
 */

export type SessionClip = {
  readonly id: string
  readonly droneId: string
  readonly droneName: string
  /** When the clip finished capturing, epoch ms. */
  readonly capturedAt: number
  readonly filename: string
  readonly mimeType: string
  readonly byteLength: number
}

type StoredClip = SessionClip & {
  readonly blob: Blob
}

let clips: readonly StoredClip[] = Object.freeze([])
/** Stable public list for useSyncExternalStore — a fresh array every read loops. */
let publicSnapshot: readonly SessionClip[] = Object.freeze([])
const listeners = new Set<() => void>()
let nextId = 1

function rebuildPublic(): void {
  publicSnapshot = Object.freeze(
    clips.map((clip) => {
      const { blob: _blob, ...pub } = clip
      return pub
    }),
  )
}

function emit(): void {
  rebuildPublic()
  for (const listener of listeners) listener()
}

function toPublic(clip: StoredClip): SessionClip {
  const { blob: _blob, ...pub } = clip
  return pub
}

export function getClipLibrarySnapshot(): readonly SessionClip[] {
  return publicSnapshot
}

export function subscribeClipLibrary(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

export function clipCount(state: readonly SessionClip[] = getClipLibrarySnapshot()): number {
  return state.length
}

/**
 * Remember a clip for this session. Accepts a Blob (preferred) or a data URL
 * so sim surfaces and MediaRecorder paths can both register without a Fleet hop.
 */
export function addClip(input: {
  readonly droneId: string
  readonly droneName: string
  readonly blob?: Blob
  readonly dataUrl?: string
  readonly filename?: string
  readonly mimeType?: string
  readonly capturedAt?: number
}): SessionClip {
  const blob = resolveBlob(input)
  const mimeType = input.mimeType ?? (blob.type || 'video/webm')
  const capturedAt = input.capturedAt ?? Date.now()
  const filename =
    input.filename ??
    `${input.droneId}-clip-${capturedAt}.${extensionFor(mimeType)}`
  const stored: StoredClip = Object.freeze({
    id: `clip-${nextId++}`,
    droneId: input.droneId,
    droneName: input.droneName,
    capturedAt,
    filename,
    mimeType,
    byteLength: blob.size,
    blob,
  })
  clips = Object.freeze([...clips, stored])
  emit()
  return toPublic(stored)
}

function resolveBlob(input: {
  readonly blob?: Blob
  readonly dataUrl?: string
  readonly mimeType?: string
}): Blob {
  if (input.blob !== undefined) return input.blob
  if (input.dataUrl !== undefined) {
    const parsed = dataUrlToBlob(input.dataUrl)
    if (parsed !== null) return parsed
  }
  return new Blob([], { type: input.mimeType ?? 'video/webm' })
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) return null
  const header = dataUrl.slice(0, comma)
  const data = dataUrl.slice(comma + 1)
  const mimeMatch = /^data:([^;,]+)/.exec(header)
  const mimeType = mimeMatch?.[1] ?? 'application/octet-stream'
  try {
    const binary = atob(data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: mimeType })
  } catch {
    return null
  }
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'mp4'
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('png')) return 'png'
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg'
  return 'bin'
}

/** Re-download a clip already in the session library. Returns false if unknown. */
export function downloadClip(id: string): boolean {
  const stored = clips.find((clip) => clip.id === id)
  if (stored === undefined) return false
  const url = URL.createObjectURL(stored.blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = stored.filename
  anchor.click()
  URL.revokeObjectURL(url)
  return true
}

export function findClip(
  id: string,
  state: readonly SessionClip[] = getClipLibrarySnapshot(),
): SessionClip | undefined {
  return state.find((clip) => clip.id === id)
}

/** Tests only — clear between cases. */
export function resetClipLibraryForTests(): void {
  clips = Object.freeze([])
  publicSnapshot = Object.freeze([])
  nextId = 1
  emit()
}
