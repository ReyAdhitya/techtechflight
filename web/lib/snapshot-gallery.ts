/**
 * Session-local gallery of stills the Teacher already captured.
 *
 * In-memory for this tab only — not Telemetry, not a Fleet Command (ADR-0011).
 * Photo evidence downloads once; this gallery keeps a thumbnail so Control /
 * the Camera dialog can show craft and time without asking the craft again.
 */

export type SessionSnapshot = {
  readonly id: string
  readonly droneId: string
  readonly droneName: string
  /** When the still was taken, epoch ms. */
  readonly capturedAt: number
  /** data: or blob: URL suitable for an <img> thumbnail. */
  readonly thumbnailUrl: string
  readonly filename: string
}

type StoredSnapshot = SessionSnapshot & {
  readonly blob: Blob
}

let snapshots: readonly StoredSnapshot[] = Object.freeze([])
/** Stable public list for useSyncExternalStore — a fresh array every read loops. */
let publicSnapshot: readonly SessionSnapshot[] = Object.freeze([])
const listeners = new Set<() => void>()
let nextId = 1

function rebuildPublic(): void {
  publicSnapshot = Object.freeze(
    snapshots.map((entry) => {
      const { blob: _blob, ...pub } = entry
      return pub
    }),
  )
}

function emit(): void {
  rebuildPublic()
  for (const listener of listeners) listener()
}

export function getSnapshotGallery(): readonly SessionSnapshot[] {
  return publicSnapshot
}

export function subscribeSnapshotGallery(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

export function snapshotCount(
  state: readonly SessionSnapshot[] = getSnapshotGallery(),
): number {
  return state.length
}

/**
 * Remember a still for this session. Prefer a data URL (canvas capture) so the
 * thumbnail can render without a second decode; a Blob is accepted too.
 */
export function addSnapshot(input: {
  readonly droneId: string
  readonly droneName: string
  readonly dataUrl?: string
  readonly blob?: Blob
  readonly filename?: string
  readonly capturedAt?: number
}): SessionSnapshot {
  const blob = resolveBlob(input)
  const capturedAt = input.capturedAt ?? Date.now()
  const filename = input.filename ?? `${input.droneId}-still-${capturedAt}.png`
  const thumbnailUrl =
    input.dataUrl ??
    (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
      ? URL.createObjectURL(blob)
      : '')
  const stored: StoredSnapshot = Object.freeze({
    id: `still-${nextId++}`,
    droneId: input.droneId,
    droneName: input.droneName,
    capturedAt,
    thumbnailUrl,
    filename,
    blob,
  })
  snapshots = Object.freeze([...snapshots, stored])
  emit()
  const { blob: _blob, ...pub } = stored
  return pub
}

function resolveBlob(input: {
  readonly dataUrl?: string
  readonly blob?: Blob
}): Blob {
  if (input.blob !== undefined) return input.blob
  if (input.dataUrl !== undefined) {
    const parsed = dataUrlToBlob(input.dataUrl)
    if (parsed !== null) return parsed
  }
  return new Blob([], { type: 'image/png' })
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) return null
  const header = dataUrl.slice(0, comma)
  const data = dataUrl.slice(comma + 1)
  const mimeMatch = /^data:([^;,]+)/.exec(header)
  const mimeType = mimeMatch?.[1] ?? 'image/png'
  try {
    const binary = atob(data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: mimeType })
  } catch {
    return null
  }
}

/** Re-download a still already in the session gallery. Returns false if unknown. */
export function downloadSnapshot(id: string): boolean {
  const stored = snapshots.find((entry) => entry.id === id)
  if (stored === undefined) return false
  const url = URL.createObjectURL(stored.blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = stored.filename
  anchor.click()
  URL.revokeObjectURL(url)
  return true
}

/** Tests only — clear between cases. */
export function resetSnapshotGalleryForTests(): void {
  for (const entry of snapshots) {
    if (entry.thumbnailUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(entry.thumbnailUrl)
      } catch {
        // jsdom may not implement revoke; ignore.
      }
    }
  }
  snapshots = Object.freeze([])
  publicSnapshot = Object.freeze([])
  nextId = 1
  emit()
}
