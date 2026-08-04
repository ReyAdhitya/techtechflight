import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CAMERA_DEVICE_KEY, NON_SECURE_ORIGIN_WORDS } from '@/lib/camera-devices'
import { CameraDevicePicker } from './CameraDevicePicker'

describe('CameraDevicePicker', () => {
  beforeEach(() => {
    window.localStorage.removeItem(CAMERA_DEVICE_KEY)
    vi.stubGlobal('navigator', {
      mediaDevices: {
        enumerateDevices: vi.fn(async () => [
          { kind: 'videoinput', deviceId: 'cam-a', label: 'Built-in webcam' },
          { kind: 'videoinput', deviceId: 'cam-b', label: 'USB camera' },
        ]),
      },
    })
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.removeItem(CAMERA_DEVICE_KEY)
  })

  it('lists cameras and remembers the Teacher choice', async () => {
    const user = userEvent.setup()
    render(<CameraDevicePicker />)

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Camera input' })).toBeInTheDocument()
    })

    const select = screen.getByRole('combobox', { name: 'Camera input' })
    expect(select).toHaveValue('cam-a')

    await user.selectOptions(select, 'cam-b')
    expect(window.localStorage.getItem(CAMERA_DEVICE_KEY)).toBe('cam-b')
  })

  it('says plainly when a non-secure origin blocks the camera', async () => {
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: false,
    })

    render(<CameraDevicePicker />)

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(NON_SECURE_ORIGIN_WORDS)
    })
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})
