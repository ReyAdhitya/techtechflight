'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import {
  cameraDeviceLabel,
  cameraOriginBlockedWords,
  listCameraDevices,
  readSelectedCameraDeviceId,
  writeSelectedCameraDeviceId,
  type CameraDevice,
} from '@/lib/camera-devices'
import { cn } from '@/lib/utils'

/**
 * Pick which camera the vision check (and sim feeds) should use.
 *
 * Integrator mounts on Vision check. Lists inputs, remembers the Teacher's choice in
 * localStorage, and says plainly when a non-secure origin blocks the camera rather than
 * failing silently.
 */
export function CameraDevicePicker({
  className,
  onDeviceChange,
}: {
  className?: string
  onDeviceChange?: (deviceId: string | null) => void
}) {
  const selectId = useId()
  const [secureContext, setSecureContext] = useState(true)
  const [devices, setDevices] = useState<readonly CameraDevice[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setSecureContext(typeof window === 'undefined' ? true : window.isSecureContext)
    setSelectedId(readSelectedCameraDeviceId())
  }, [])

  const refreshDevices = useCallback(async () => {
    setLoading(true)
    try {
      const listed = await listCameraDevices()
      setDevices(listed)
      const saved = readSelectedCameraDeviceId()
      if (saved !== null && listed.some((device) => device.deviceId === saved)) {
        setSelectedId(saved)
      } else if (listed.length > 0 && saved === null) {
        const first = listed[0]!
        setSelectedId(first.deviceId)
        writeSelectedCameraDeviceId(first.deviceId)
        onDeviceChange?.(first.deviceId)
      }
    } finally {
      setLoading(false)
    }
  }, [onDeviceChange])

  useEffect(() => {
    void refreshDevices()
  }, [refreshDevices])

  const blockedWords = cameraOriginBlockedWords(secureContext)

  const handleChange = (deviceId: string) => {
    setSelectedId(deviceId)
    writeSelectedCameraDeviceId(deviceId)
    onDeviceChange?.(deviceId)
  }

  return (
    <section
      className={cn(
        'flex flex-col gap-3 rounded-[0.75rem] border border-hairline bg-surface-1 p-4',
        className,
      )}
      aria-labelledby={`${selectId}-heading`}
    >
      <div className="flex flex-col gap-1">
        <h2 id={`${selectId}-heading`} className="m-0 font-display text-section font-medium">
          Camera
        </h2>
        <p className="m-0 max-w-[60ch] text-body text-ink-subtle">
          Which camera to use for vision checks and simulated feeds on this machine.
        </p>
      </div>

      {blockedWords !== null ? (
        <p className="m-0 text-body text-[color:var(--color-fault)]" role="status">
          {blockedWords}
        </p>
      ) : loading ? (
        <p className="m-0 text-body text-ink-subtle">Listing cameras…</p>
      ) : devices.length === 0 ? (
        <p className="m-0 text-body text-ink-subtle">
          No cameras reported. Plug in a webcam and reload, or allow camera access once so
          the browser can name them.
        </p>
      ) : (
        <label className="flex flex-col gap-1">
          <span className="label">Camera input</span>
          <select
            id={selectId}
            value={selectedId ?? ''}
            onChange={(event) => handleChange(event.target.value)}
            className="min-h-11 rounded-[0.75rem] border border-hairline bg-canvas px-3 py-2 text-body text-ink"
          >
            {devices.map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>
                {cameraDeviceLabel(device, index)}
              </option>
            ))}
          </select>
        </label>
      )}
    </section>
  )
}
