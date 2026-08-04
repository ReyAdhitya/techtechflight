import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CAMERA_DEVICE_KEY,
  cameraDeviceLabel,
  cameraOriginBlockedWords,
  listCameraDevices,
  NON_SECURE_ORIGIN_WORDS,
  readSelectedCameraDeviceId,
  writeSelectedCameraDeviceId,
} from './camera-devices'

describe('remembering the chosen camera', () => {
  afterEach(() => {
    window.localStorage.removeItem(CAMERA_DEVICE_KEY)
  })

  it('round-trips the device id through localStorage', () => {
    expect(readSelectedCameraDeviceId()).toBeNull()
    writeSelectedCameraDeviceId('cam-a')
    expect(readSelectedCameraDeviceId()).toBe('cam-a')
    writeSelectedCameraDeviceId(null)
    expect(readSelectedCameraDeviceId()).toBeNull()
  })
})

describe('listing cameras', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns videoinput devices from enumerateDevices', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: {
        enumerateDevices: vi.fn(async () => [
          { kind: 'audioinput', deviceId: 'mic', label: 'Mic' },
          { kind: 'videoinput', deviceId: 'cam-1', label: 'Built-in webcam' },
          { kind: 'videoinput', deviceId: 'cam-2', label: '' },
        ]),
      },
    })

    const devices = await listCameraDevices()
    expect(devices).toEqual([
      { deviceId: 'cam-1', label: 'Built-in webcam' },
      { deviceId: 'cam-2', label: '' },
    ])
    expect(cameraDeviceLabel(devices[1]!, 1)).toBe('Camera 2')
  })
})

describe('non-secure origins', () => {
  it('names the block in words rather than staying silent', () => {
    expect(cameraOriginBlockedWords(false)).toBe(NON_SECURE_ORIGIN_WORDS)
    expect(cameraOriginBlockedWords(true)).toBeNull()
  })
})
