import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AI_DETECT_URL_KEY,
  createHttpYoloDetector,
  fetchAiHealth,
  resolveAiDetectUrl,
} from './http-yolo-detector.ts'

afterEach(() => {
  vi.unstubAllGlobals()
  window.localStorage.removeItem(AI_DETECT_URL_KEY)
})

describe('resolveAiDetectUrl', () => {
  it('prefers localStorage over the classroom default', () => {
    window.localStorage.setItem(AI_DETECT_URL_KEY, 'http://127.0.0.1:9090/')
    expect(resolveAiDetectUrl()).toBe('http://127.0.0.1:9090')
  })

  it('falls back to the classroom default on :8090', () => {
    expect(resolveAiDetectUrl()).toBe('http://127.0.0.1:8090')
  })
})

describe('createHttpYoloDetector', () => {
  it('returns null when health is down', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 503 })),
    )
    expect(await createHttpYoloDetector('http://127.0.0.1:8090')).toBeNull()
  })

  it('maps detect JSON onto Detection including trackId', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = String(input)
        if (url.endsWith('/health')) {
          return Response.json({
            status: 'ok',
            device: 'cpu',
            model_id: 'yolo11x',
            imgsz: 1280,
            tracker: 'bytetrack',
          })
        }
        return Response.json({
          detections: [
            {
              id: 'd0',
              label: 'person',
              confidence: 0.91,
              box: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
              track_id: '7',
            },
          ],
          ts: 1,
          model_id: 'yolo11x',
          device: 'cpu',
        })
      }),
    )

    const detector = await createHttpYoloDetector('http://127.0.0.1:8090')
    expect(detector?.displayName).toBe('yolo11x')
    expect(detector?.aiHealth.device).toBe('cpu')

    HTMLCanvasElement.prototype.toBlob = function (cb) {
      cb(new Blob(['x'], { type: 'image/jpeg' }))
    }
    const canvas = document.createElement('canvas')
    canvas.width = 8
    canvas.height = 8
    const found = await detector!.detect({ surfaceId: 't', source: canvas })
    expect(found).toEqual([
      {
        id: 'd0',
        label: 'person',
        confidence: 0.91,
        box: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
        trackId: '7',
      },
    ])
  })
})

describe('fetchAiHealth', () => {
  it('returns null on network failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      }),
    )
    expect(await fetchAiHealth('http://127.0.0.1:8090')).toBeNull()
  })
})
