import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { addClip, resetClipLibraryForTests } from '@/lib/clip-library'
import { ClipLibrary } from './ClipLibrary'

describe('ClipLibrary', () => {
  afterEach(() => {
    resetClipLibraryForTests()
    vi.restoreAllMocks()
  })

  it('shows zero clips when the session is empty', () => {
    render(<ClipLibrary />)
    expect(screen.getByText('0 clips this session')).toBeInTheDocument()
    expect(screen.getByText(/No clips captured yet/)).toBeInTheDocument()
  })

  it('lists session clips with craft and re-download', () => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:x'),
      revokeObjectURL: vi.fn(),
    })
    const click = vi.fn()
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag !== 'a') {
        return document.createElementNS('http://www.w3.org/1999/xhtml', tag)
      }
      return { href: '', download: '', click } as unknown as HTMLAnchorElement
    })

    addClip({
      droneId: 'ttf-0001',
      droneName: 'Drone 1',
      blob: new Blob(['a'], { type: 'video/webm' }),
      filename: 'ttf-0001-clip.webm',
      capturedAt: Date.parse('2026-08-03T10:15:00Z'),
    })

    render(<ClipLibrary />)

    expect(screen.getByText('1 clip this session')).toBeInTheDocument()
    expect(screen.getByText('Drone 1')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Download again' }))
    expect(click).toHaveBeenCalled()
  })

  it('can narrow the list to one craft', () => {
    addClip({
      droneId: 'ttf-0001',
      droneName: 'Drone 1',
      blob: new Blob(['a'], { type: 'video/webm' }),
      capturedAt: 1_000,
    })
    addClip({
      droneId: 'ttf-0002',
      droneName: 'Drone 2',
      blob: new Blob(['b'], { type: 'video/webm' }),
      capturedAt: 2_000,
    })

    render(<ClipLibrary droneId="ttf-0002" />)

    expect(screen.getByText('1 clip this session')).toBeInTheDocument()
    expect(screen.getByText('Drone 2')).toBeInTheDocument()
    expect(screen.queryByText('Drone 1')).not.toBeInTheDocument()
  })
})
