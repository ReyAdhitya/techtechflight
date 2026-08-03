import { afterEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  orientationFor,
  resetCameraOrientationForTests,
} from '@/lib/camera-orientation'
import { CameraOrientationControl } from './CameraOrientationControl'

describe('CameraOrientationControl', () => {
  afterEach(() => {
    resetCameraOrientationForTests()
  })

  it('mirrors and rotates one craft, persisted for the pane', () => {
    render(<CameraOrientationControl droneId="ttf-0001" />)

    fireEvent.click(screen.getByRole('button', { name: 'Mirror' }))
    expect(screen.getByRole('button', { name: 'Mirrored' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(orientationFor('ttf-0001').mirror).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Rotate 90°' }))
    expect(orientationFor('ttf-0001')).toEqual({ mirror: true, rotation: 90 })
    expect(screen.getByText(/mirrored/)).toBeInTheDocument()
    expect(
      document.querySelector('[data-transform="scaleX(-1) rotate(90deg)"]'),
    ).not.toBeNull()
  })

  it('exposes the CSS transform for the Integrator', () => {
    render(<CameraOrientationControl droneId="ttf-0002" />)
    fireEvent.click(screen.getByRole('button', { name: 'Mirror' }))
    fireEvent.click(screen.getByRole('button', { name: 'Rotate 90°' }))

    expect(
      document.querySelector('[data-transform="scaleX(-1) rotate(90deg)"]'),
    ).not.toBeNull()
  })
})
