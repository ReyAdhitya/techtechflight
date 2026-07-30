import { afterEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { resetCameraRecordingForTests } from '@/lib/camera-recording'
import { CameraRecordAllButton } from './CameraRecordAllButton'
import { CameraRecordingClip } from './CameraRecordingClip'

describe('camera record controls', () => {
  afterEach(() => {
    resetCameraRecordingForTests()
  })

  it('toggles one Drone between Record and Stop recording', () => {
    render(<CameraRecordingClip droneId="ttf-0001" />)

    fireEvent.click(screen.getByRole('button', { name: 'Record' }))
    expect(screen.getByRole('button', { name: 'Stop recording' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Stop recording' }))
    expect(screen.getByRole('button', { name: 'Record' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('marks every listed Drone from Record all cameras', () => {
    render(
      <>
        <CameraRecordAllButton droneIds={['ttf-0001', 'ttf-0002']} />
        <CameraRecordingClip droneId="ttf-0001" />
        <CameraRecordingClip droneId="ttf-0002" />
      </>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Record all cameras' }))
    expect(screen.getAllByRole('button', { name: 'Stop recording' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Stop all recordings' })).toBeInTheDocument()
  })
})
