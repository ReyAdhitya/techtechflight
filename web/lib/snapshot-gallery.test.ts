import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addSnapshot,
  downloadSnapshot,
  getSnapshotGallery,
  resetSnapshotGalleryForTests,
  snapshotCount,
  subscribeSnapshotGallery,
} from './snapshot-gallery'

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

describe('snapshot gallery for the session', () => {
  afterEach(() => {
    resetSnapshotGalleryForTests()
    vi.restoreAllMocks()
  })

  it('remembers a still with craft and time', () => {
    const still = addSnapshot({
      droneId: 'ttf-0001',
      droneName: 'Drone 1',
      dataUrl: TINY_PNG,
      capturedAt: 1_700_000_000_000,
    })

    expect(still.droneName).toBe('Drone 1')
    expect(still.capturedAt).toBe(1_700_000_000_000)
    expect(still.thumbnailUrl).toBe(TINY_PNG)
    expect(snapshotCount()).toBe(1)
    expect(getSnapshotGallery()[0]?.id).toBe(still.id)
  })

  it('keeps insertion order across crafts', () => {
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

    expect(getSnapshotGallery().map((s) => s.droneId)).toEqual([
      'ttf-0001',
      'ttf-0002',
    ])
  })

  it('re-downloads a remembered still', () => {
    const createObjectURL = vi.fn(() => 'blob:still-1')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    const clicks: Array<{ download: string }> = []
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag !== 'a') {
        return document.createElementNS('http://www.w3.org/1999/xhtml', tag)
      }
      const anchor = {
        href: '',
        download: '',
        click: vi.fn(function (this: { download: string }) {
          clicks.push({ download: this.download })
        }),
      }
      return anchor as unknown as HTMLAnchorElement
    })

    const still = addSnapshot({
      droneId: 'ttf-0003',
      droneName: 'Drone 3',
      dataUrl: TINY_PNG,
      filename: 'ttf-0003-still.png',
      capturedAt: 3_000,
    })

    expect(downloadSnapshot(still.id)).toBe(true)
    expect(clicks[0]?.download).toBe('ttf-0003-still.png')
    expect(downloadSnapshot('missing')).toBe(false)
  })

  it('notifies subscribers when a still is added', () => {
    const onChange = vi.fn()
    const unsubscribe = subscribeSnapshotGallery(onChange)
    addSnapshot({
      droneId: 'ttf-0001',
      droneName: 'Drone 1',
      dataUrl: TINY_PNG,
    })
    expect(onChange).toHaveBeenCalledTimes(1)
    unsubscribe()
  })
})
