import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  clearStoredCameraStreamMap,
  resolveCameraStreamMap,
} from '@/lib/camera-stream-map'
import { CameraStreamMapPanel } from './CameraStreamMapPanel'

beforeEach(() => {
  clearStoredCameraStreamMap()
  vi.unstubAllEnvs()
})

afterEach(() => {
  clearStoredCameraStreamMap()
  vi.unstubAllEnvs()
})

describe('school camera streams in Settings', () => {
  it('saves a sanitized map to this browser and rejects script URLs', () => {
    render(<CameraStreamMapPanel />)

    fireEvent.change(screen.getByLabelText('Drone id'), {
      target: { value: 'ttf-0001' },
    })
    fireEvent.change(screen.getByLabelText('Stream URL'), {
      target: { value: 'javascript:alert(1)' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save map' }))

    expect(screen.getByRole('alert')).toHaveTextContent(/absolute http\(s\)/)
    expect(resolveCameraStreamMap()).toEqual({})

    fireEvent.change(screen.getByLabelText('Stream URL'), {
      target: { value: 'https://cam.school.example/1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save map' }))

    expect(resolveCameraStreamMap()).toEqual({
      'ttf-0001': 'https://cam.school.example/1',
    })
    expect(screen.getByRole('status')).toHaveTextContent(/Saved in this browser/)
  })

  it('documents the deploy-time env seed', () => {
    render(<CameraStreamMapPanel />)
    expect(screen.getByText(/NEXT_PUBLIC_CAMERA_STREAM_MAP/)).toBeInTheDocument()
  })
})
