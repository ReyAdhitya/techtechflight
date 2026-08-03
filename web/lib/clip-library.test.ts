import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addClip,
  clipCount,
  downloadClip,
  findClip,
  getClipLibrarySnapshot,
  resetClipLibraryForTests,
  subscribeClipLibrary,
} from './clip-library'

describe('clip library for the session', () => {
  afterEach(() => {
    resetClipLibraryForTests()
    vi.restoreAllMocks()
  })

  it('remembers a clip and lists it for this session', () => {
    const clip = addClip({
      droneId: 'ttf-0001',
      droneName: 'Drone 1',
      blob: new Blob(['frame-bytes'], { type: 'video/webm' }),
      capturedAt: 1_700_000_000_000,
    })

    expect(clip.droneId).toBe('ttf-0001')
    expect(clip.droneName).toBe('Drone 1')
    expect(clip.byteLength).toBeGreaterThan(0)
    expect(clipCount()).toBe(1)
    expect(getClipLibrarySnapshot()[0]?.id).toBe(clip.id)
    expect(findClip(clip.id)?.filename).toContain('ttf-0001')
  })

  it('keeps insertion order when another clip arrives', () => {
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

    expect(getClipLibrarySnapshot().map((c) => c.droneId)).toEqual([
      'ttf-0001',
      'ttf-0002',
    ])
  })

  it('re-downloads a remembered clip by id', () => {
    const createObjectURL = vi.fn(() => 'blob:clip-1')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    const clicks: Array<{ download: string; href: string }> = []
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag !== 'a') {
        return document.createElementNS('http://www.w3.org/1999/xhtml', tag)
      }
      const anchor = {
        href: '',
        download: '',
        click: vi.fn(function (this: { href: string; download: string }) {
          clicks.push({ href: this.href, download: this.download })
        }),
      }
      return anchor as unknown as HTMLAnchorElement
    })

    const clip = addClip({
      droneId: 'ttf-0003',
      droneName: 'Drone 3',
      blob: new Blob(['bytes'], { type: 'video/webm' }),
      filename: 'ttf-0003-clip.webm',
      capturedAt: 3_000,
    })

    expect(downloadClip(clip.id)).toBe(true)
    expect(clicks[0]?.download).toBe('ttf-0003-clip.webm')
    expect(clicks[0]?.href).toBe('blob:clip-1')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:clip-1')
    expect(downloadClip('missing')).toBe(false)
  })

  it('notifies subscribers when a clip is added', () => {
    const onChange = vi.fn()
    const unsubscribe = subscribeClipLibrary(onChange)
    addClip({
      droneId: 'ttf-0001',
      droneName: 'Drone 1',
      blob: new Blob(['x'], { type: 'video/webm' }),
    })
    expect(onChange).toHaveBeenCalledTimes(1)
    unsubscribe()
    addClip({
      droneId: 'ttf-0002',
      droneName: 'Drone 2',
      blob: new Blob(['y'], { type: 'video/webm' }),
    })
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
