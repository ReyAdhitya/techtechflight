/**
 * Which camera this browser uses for vision — listed, chosen, remembered.
 *
 * Persisted in localStorage, never on Telemetry. The Integrator mounts
 * `CameraDevicePicker` on Vision check; this module holds the list and the
 * saved choice.
 */

export const CAMERA_DEVICE_KEY = 'techtechflight:camera-device'

/** Shown when the page is not a secure origin — camera APIs stay blocked. */
export const NON_SECURE_ORIGIN_WORDS =
  'The browser will not open a camera on this address. Open the board at http://localhost:4321 on the machine itself. A plain http:// network address is not a secure origin.'

export interface CameraDevice {
  readonly deviceId: string
  readonly label: string
}

export function readSelectedCameraDeviceId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(CAMERA_DEVICE_KEY)
    return value && value.length > 0 ? value : null
  } catch {
    return null
  }
}

export function writeSelectedCameraDeviceId(deviceId: string | null): void {
  if (typeof window === 'undefined') return
  try {
    if (deviceId === null || deviceId.length === 0) {
      window.localStorage.removeItem(CAMERA_DEVICE_KEY)
      return
    }
    window.localStorage.setItem(CAMERA_DEVICE_KEY, deviceId)
  } catch {
    // localStorage unavailable — the picker still holds React state for the session.
  }
}

/** Null when the origin is fine; otherwise the plain explanation a Teacher needs. */
export function cameraOriginBlockedWords(secureContext: boolean): string | null {
  return secureContext ? null : NON_SECURE_ORIGIN_WORDS
}

/** What to show when the browser has not named a device yet. */
export function cameraDeviceFallbackLabel(index: number): string {
  return `Camera ${index + 1}`
}

export function cameraDeviceLabel(device: CameraDevice, index: number): string {
  const trimmed = device.label.trim()
  return trimmed.length > 0 ? trimmed : cameraDeviceFallbackLabel(index)
}

/**
 * Video inputs from `enumerateDevices`.
 *
 * Labels are often blank until the Teacher has granted camera permission once —
 * the picker still lists device ids and uses fallback names.
 */
export async function listCameraDevices(): Promise<readonly CameraDevice[]> {
  if (typeof navigator === 'undefined') return []
  const media = navigator.mediaDevices
  if (!media?.enumerateDevices) return []

  const devices = await media.enumerateDevices()
  return devices
    .filter((device) => device.kind === 'videoinput')
    .map((device) => ({
      deviceId: device.deviceId,
      label: device.label ?? '',
    }))
}
