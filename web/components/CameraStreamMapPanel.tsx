'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  clearStoredCameraStreamMap,
  hasStoredCameraStreamMap,
  readServerCameraStreamMap,
  resolveCameraStreamMap,
  sanitizeStreamUrl,
  subscribeCameraStreamMap,
  writeCameraStreamMap,
  type CameraStreamMap,
} from '@/lib/camera-stream-map'

type DraftRow = { droneId: string; url: string }

/**
 * Per-Drone stream endpoints for hardware cameras.
 *
 * Settings only — never Telemetry. Teachers edit the map here; an empty browser
 * can still seed from `NEXT_PUBLIC_CAMERA_STREAM_MAP` at build time. Saving
 * writes localStorage and wins over the env seed until cleared.
 */
export function CameraStreamMapPanel() {
  const map = useSyncExternalStore(
    subscribeCameraStreamMap,
    resolveCameraStreamMap,
    readServerCameraStreamMap,
  )
  const hasStored = useSyncExternalStore(
    subscribeCameraStreamMap,
    hasStoredCameraStreamMap,
    () => false,
  )

  const [rows, setRows] = useState<DraftRow[]>(() => rowsFromMap(map))
  const [error, setError] = useState<string | null>(null)
  const [savedNotice, setSavedNotice] = useState<string | null>(null)

  const mapKey = JSON.stringify(map)
  useEffect(() => {
    setRows(rowsFromMap(map))
  }, [mapKey, map])

  return (
    <section className="flex flex-col gap-4 rounded-surface border border-hairline bg-surface-1 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="label m-0">School camera streams</h2>
        <p className="m-0 text-value text-ink-subtle">
          Map each Drone id to an http(s) stream URL. Telemetry only says whether a camera
          is streaming — the picture address stays here. Simulated Fleets keep their labeled
          demo feed and ignore this map.
        </p>
      </div>

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {rows.map((row, index) => (
          <li key={index} className="flex flex-col gap-2 min-[32rem]:flex-row min-[32rem]:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="label">Drone id</span>
              <input
                type="text"
                value={row.droneId}
                onChange={(event) => {
                  const value = event.target.value
                  setRows((current) =>
                    current.map((entry, i) => (i === index ? { ...entry, droneId: value } : entry)),
                  )
                  setSavedNotice(null)
                }}
                className="min-h-11 rounded-surface border border-hairline bg-canvas px-3 text-value text-ink"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <label className="flex min-w-0 flex-[2] flex-col gap-1">
              <span className="label">Stream URL</span>
              <input
                type="url"
                value={row.url}
                onChange={(event) => {
                  const value = event.target.value
                  setRows((current) =>
                    current.map((entry, i) => (i === index ? { ...entry, url: value } : entry)),
                  )
                  setSavedNotice(null)
                }}
                placeholder="https://"
                className="min-h-11 rounded-surface border border-hairline bg-canvas px-3 text-value text-ink"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setRows((current) => current.filter((_, i) => i !== index))
                setSavedNotice(null)
              }}
              className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted hover:border-ink hover:text-ink"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setRows((current) => [...current, { droneId: '', url: '' }])
            setSavedNotice(null)
          }}
          className="min-h-11 cursor-pointer rounded-pill border border-dashed border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted hover:border-ink hover:text-ink"
        >
          Add stream
        </button>
        <button
          type="button"
          onClick={() => {
            const result = draftToMap(rows)
            if (!result.ok) {
              setError(result.error)
              setSavedNotice(null)
              return
            }
            writeCameraStreamMap(result.map)
            setError(null)
            setSavedNotice('Saved in this browser. Env seed is overridden until you clear.')
          }}
          className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
        >
          Save map
        </button>
        {hasStored && (
          <button
            type="button"
            onClick={() => {
              clearStoredCameraStreamMap()
              setError(null)
              setSavedNotice('Cleared browser map. Env seed applies again if set.')
            }}
            className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted hover:border-ink hover:text-ink"
          >
            Clear browser map
          </button>
        )}
      </div>

      {error && (
        <p className="m-0 text-value text-status-fault" role="alert">
          {error}
        </p>
      )}
      {savedNotice && (
        <p className="m-0 text-value text-ink-subtle" role="status">
          {savedNotice}
        </p>
      )}

      <p className="m-0 text-label text-ink-muted">
        Deploy seed (optional): set{' '}
        <code className="text-ink">NEXT_PUBLIC_CAMERA_STREAM_MAP</code> to a JSON object of
        Drone id → http(s) URL at build time. The board plays mapped streams with a native{' '}
        <code className="text-ink">&lt;video&gt;</code> element — progressive HTTP(S) media, or
        Safari-native HLS (<code className="text-ink">.m3u8</code>). No hls.js in this release.
      </p>
    </section>
  )
}

function rowsFromMap(map: CameraStreamMap): DraftRow[] {
  const entries = Object.entries(map)
  if (entries.length === 0) return [{ droneId: '', url: '' }]
  return entries.map(([droneId, url]) => ({ droneId, url }))
}

function draftToMap(
  rows: DraftRow[],
): { ok: true; map: CameraStreamMap } | { ok: false; error: string } {
  const next: Record<string, string> = {}
  for (const row of rows) {
    const droneId = row.droneId.trim()
    const urlRaw = row.url.trim()
    if (droneId.length === 0 && urlRaw.length === 0) continue
    if (droneId.length === 0) {
      return { ok: false, error: 'Every stream row needs a Drone id.' }
    }
    if (urlRaw.length === 0) {
      return { ok: false, error: `Drone ${droneId} needs a stream URL.` }
    }
    const url = sanitizeStreamUrl(urlRaw)
    if (url === null) {
      return {
        ok: false,
        error: `Drone ${droneId}: URL must be absolute http(s) with no credentials.`,
      }
    }
    if (next[droneId] !== undefined) {
      return { ok: false, error: `Drone ${droneId} is listed twice.` }
    }
    next[droneId] = url
  }
  return { ok: true, map: next }
}
