import { describe, expect, it, vi } from 'vitest'
import { downloadPhotoFromVideo, downloadPlaceholderEvidence } from './photo-evidence'

describe('photo evidence', () => {
  it('captures a video frame to a PNG download', () => {
    const anchors: Array<{ download: string; click: ReturnType<typeof vi.fn> }> = []
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: vi.fn(),
          }),
          toDataURL: () => 'data:image/png;base64,abc',
        } as unknown as HTMLCanvasElement
      }
      const anchor = { download: '', click: vi.fn() }
      anchors.push(anchor)
      return anchor as unknown as HTMLAnchorElement
    })

    const video = {
      videoWidth: 640,
      videoHeight: 360,
    } as HTMLVideoElement

    expect(downloadPhotoFromVideo(video, 'drone-1.png')).toBe(true)
    expect(anchors[0]?.download).toBe('drone-1.png')
  })

  it('refuses when the video has no dimensions', () => {
    const video = { videoWidth: 0, videoHeight: 0 } as HTMLVideoElement
    expect(downloadPhotoFromVideo(video, 'x.png')).toBe(false)
  })

  it('downloads a labelled placeholder for sim surfaces', () => {
    let href = ''
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            fillRect: vi.fn(),
            fillText: vi.fn(),
            fillStyle: '',
            font: '',
          }),
          toDataURL: () => 'data:image/png;base64,sim',
        } as unknown as HTMLCanvasElement
      }
      return {
        click: vi.fn(),
        set href(value: string) {
          href = value
        },
        get href() {
          return href
        },
        download: '',
      } as unknown as HTMLAnchorElement
    })
    downloadPlaceholderEvidence('Drone 1', 'drone-1-sim.png')
    expect(href).toBe('data:image/png;base64,sim')
  })
})
