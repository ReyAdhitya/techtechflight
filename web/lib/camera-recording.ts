/**
 * Session-local camera recording marks — which Drones the Teacher is clipping.
 *
 * Not a Fleet Command (ADR-0011). No bytes are captured yet; the board remembers who is
 * marked so Control, Walls, and CameraPane stay in sync for the tab.
 */

export type CameraRecordingMap = Readonly<Record<string, number>>

let map: CameraRecordingMap = Object.freeze({})
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function getCameraRecordingSnapshot(): CameraRecordingMap {
  return map
}

export function subscribeCameraRecording(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

export function isRecording(droneId: string, state: CameraRecordingMap = map): boolean {
  return state[droneId] !== undefined
}

export function recordingCount(state: CameraRecordingMap = map): number {
  return Object.keys(state).length
}

export function startRecording(droneId: string, at = Date.now()): void {
  if (map[droneId] !== undefined) return
  map = Object.freeze({ ...map, [droneId]: at })
  emit()
}

export function stopRecording(droneId: string): void {
  if (map[droneId] === undefined) return
  const next: Record<string, number> = { ...map }
  delete next[droneId]
  map = Object.freeze(next)
  emit()
}

export function startRecordingAll(droneIds: readonly string[], at = Date.now()): void {
  if (droneIds.length === 0) return
  const next: Record<string, number> = { ...map }
  for (const id of droneIds) {
    if (next[id] === undefined) next[id] = at
  }
  map = Object.freeze(next)
  emit()
}

export function stopRecordingAll(droneIds?: readonly string[]): void {
  if (droneIds === undefined) {
    if (Object.keys(map).length === 0) return
    map = Object.freeze({})
    emit()
    return
  }
  if (droneIds.length === 0) return
  const next: Record<string, number> = { ...map }
  let changed = false
  for (const id of droneIds) {
    if (next[id] !== undefined) {
      delete next[id]
      changed = true
    }
  }
  if (!changed) return
  map = Object.freeze(next)
  emit()
}

/** Tests only — clear between cases. */
export function resetCameraRecordingForTests(): void {
  map = Object.freeze({})
  emit()
}
