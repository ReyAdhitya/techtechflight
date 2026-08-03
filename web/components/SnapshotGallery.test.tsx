import { afterEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { addSnapshot, resetSnapshotGalleryForTests } from '@/lib/snapshot-gallery'
import { SnapshotGallery } from './SnapshotGallery'

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

describe('SnapshotGallery', () => {
  afterEach(() => {
    resetSnapshotGalleryForTests()
  })

  it('shows zero stills when the session is empty', () => {
    render(<SnapshotGallery />)
    expect(screen.getByText('0 stills this session')).toBeInTheDocument()
    expect(screen.getByText(/No stills yet/)).toBeInTheDocument()
  })

  it('shows thumbnails with craft and time', () => {
    addSnapshot({
      droneId: 'ttf-0001',
      droneName: 'Drone 1',
      dataUrl: TINY_PNG,
      capturedAt: Date.parse('2026-08-03T10:15:00Z'),
    })

    render(<SnapshotGallery />)

    expect(screen.getByText('1 still this session')).toBeInTheDocument()
    expect(screen.getByText('Drone 1')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Still from Drone 1' })).toHaveAttribute(
      'src',
      TINY_PNG,
    )
  })

  it('can narrow the gallery to one craft', () => {
    addSnapshot({
      droneId: 'ttf-0001',
      droneName: 'Drone 1',
      dataUrl: TINY_PNG,
      capturedAt: 1_000,
    })
    addSnapshot({
      droneId: 'ttf-0002',
      droneName: 'Drone 2',
      dataUrl: TINY_PNG,
      capturedAt: 2_000,
    })

    render(<SnapshotGallery droneId="ttf-0002" />)

    expect(screen.getByText('1 still this session')).toBeInTheDocument()
    expect(screen.getByText('Drone 2')).toBeInTheDocument()
    expect(screen.queryByText('Drone 1')).not.toBeInTheDocument()
  })
})
