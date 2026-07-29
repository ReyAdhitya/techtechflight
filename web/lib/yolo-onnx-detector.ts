/**
 * YOLOv8n (COCO) via onnxruntime-web — real person/object boxes in the browser.
 *
 * Weights: /models/yolov8n.onnx (fetch with `node scripts/fetch-yolo-model.mjs`).
 * Wasm binaries load from jsDelivr so the static export stays lean.
 * Telemetry still carries only `camera.streaming` — detections never go on the wire.
 */

import type { Detection, DetectionFrame, ObjectDetector } from './object-detection'
import { COCO_LABELS } from './coco-labels'

const MODEL_URL = '/models/yolov8n.onnx'
const INPUT = 640
const CONF = 0.45
const IOU = 0.45
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/'

type OrtModule = typeof import('onnxruntime-web')
type InferenceSession = import('onnxruntime-web').InferenceSession

let ortPromise: Promise<OrtModule> | null = null
let sessionPromise: Promise<InferenceSession | null> | null = null

async function loadOrt(): Promise<OrtModule> {
  if (!ortPromise) {
    ortPromise = import('onnxruntime-web').then((ort) => {
      ort.env.wasm.wasmPaths = WASM_CDN
      return ort
    })
  }
  return ortPromise
}

async function loadSession(): Promise<InferenceSession | null> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      try {
        const ort = await loadOrt()
        return await ort.InferenceSession.create(MODEL_URL, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        })
      } catch {
        return null
      }
    })()
  }
  return sessionPromise
}

function letterbox(source: CanvasImageSource, size: number): {
  canvas: HTMLCanvasElement
  scale: number
  padX: number
  padY: number
} {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')

  const w =
    'videoWidth' in source && typeof source.videoWidth === 'number' && source.videoWidth > 0
      ? source.videoWidth
      : 'naturalWidth' in source && typeof source.naturalWidth === 'number'
        ? source.naturalWidth
        : 'width' in source && typeof source.width === 'number'
          ? source.width
          : size
  const h =
    'videoHeight' in source && typeof source.videoHeight === 'number' && source.videoHeight > 0
      ? source.videoHeight
      : 'naturalHeight' in source && typeof source.naturalHeight === 'number'
        ? source.naturalHeight
        : 'height' in source && typeof source.height === 'number'
          ? source.height
          : size

  const scale = Math.min(size / w, size / h)
  const nw = w * scale
  const nh = h * scale
  const padX = (size - nw) / 2
  const padY = (size - nh) / 2
  ctx.fillStyle = '#114'
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(source as CanvasImageSource, padX, padY, nw, nh)
  return { canvas, scale, padX, padY }
}

function imageDataToTensor(data: ImageData, ort: OrtModule) {
  const { data: px, width, height } = data
  const float = new Float32Array(3 * width * height)
  for (let i = 0; i < width * height; i++) {
    float[i] = px[i * 4]! / 255
    float[width * height + i] = px[i * 4 + 1]! / 255
    float[2 * width * height + i] = px[i * 4 + 2]! / 255
  }
  return new ort.Tensor('float32', float, [1, 3, height, width])
}

function iou(
  a: { x1: number; y1: number; x2: number; y2: number },
  b: { x1: number; y1: number; x2: number; y2: number },
): number {
  const x1 = Math.max(a.x1, b.x1)
  const y1 = Math.max(a.y1, b.y1)
  const x2 = Math.min(a.x2, b.x2)
  const y2 = Math.min(a.y2, b.y2)
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  const areaA = (a.x2 - a.x1) * (a.y2 - a.y1)
  const areaB = (b.x2 - b.x1) * (b.y2 - b.y1)
  return inter / (areaA + areaB - inter + 1e-6)
}

function nms(
  boxes: Array<{
    x1: number
    y1: number
    x2: number
    y2: number
    score: number
    classId: number
  }>,
): typeof boxes {
  const sorted = [...boxes].sort((a, b) => b.score - a.score)
  const kept: typeof boxes = []
  for (const box of sorted) {
    if (kept.every((k) => iou(box, k) < IOU)) kept.push(box)
    if (kept.length >= 40) break
  }
  return kept
}

function decodeYolo(
  output: import('onnxruntime-web').Tensor,
  meta: { scale: number; padX: number; padY: number; srcW: number; srcH: number },
): Detection[] {
  const data = output.data as Float32Array
  const dims = output.dims
  // YOLOv8 export: [1, 84, N] or [1, N, 84]
  let numPred = 0
  let channels = 0
  let transposed = false
  if (dims.length === 3 && dims[1] === 84) {
    channels = 84
    numPred = dims[2]!
    transposed = true
  } else if (dims.length === 3 && dims[2] === 84) {
    channels = 84
    numPred = dims[1]!
  } else {
    return []
  }

  const raw: Array<{
    x1: number
    y1: number
    x2: number
    y2: number
    score: number
    classId: number
  }> = []

  for (let i = 0; i < numPred; i++) {
    let best = 0
    let bestScore = 0
    for (let c = 0; c < 80; c++) {
      const score = transposed
        ? data[(4 + c) * numPred + i]!
        : data[i * channels + (4 + c)]!
      if (score > bestScore) {
        bestScore = score
        best = c
      }
    }
    if (bestScore < CONF) continue

    const cx = transposed ? data[0 * numPred + i]! : data[i * channels]!
    const cy = transposed ? data[1 * numPred + i]! : data[i * channels + 1]!
    const w = transposed ? data[2 * numPred + i]! : data[i * channels + 2]!
    const h = transposed ? data[3 * numPred + i]! : data[i * channels + 3]!

    // Undo letterbox → original image pixels, then normalise 0–1 for the overlay.
    const x1 = (cx - w / 2 - meta.padX) / meta.scale
    const y1 = (cy - h / 2 - meta.padY) / meta.scale
    const x2 = (cx + w / 2 - meta.padX) / meta.scale
    const y2 = (cy + h / 2 - meta.padY) / meta.scale

    raw.push({
      x1: Math.max(0, x1),
      y1: Math.max(0, y1),
      x2: Math.min(meta.srcW, x2),
      y2: Math.min(meta.srcH, y2),
      score: bestScore,
      classId: best,
    })
  }

  return nms(raw).map((box, index) => {
    const bw = Math.max(1, box.x2 - box.x1)
    const bh = Math.max(1, box.y2 - box.y1)
    return {
      id: `yolo-${index}-${box.classId}`,
      label: COCO_LABELS[box.classId] ?? `class-${box.classId}`,
      confidence: box.score,
      box: {
        x: box.x1 / meta.srcW,
        y: box.y1 / meta.srcH,
        width: bw / meta.srcW,
        height: bh / meta.srcH,
      },
    }
  })
}

export type FrameSource = CanvasImageSource | ImageData

/**
 * Builds a detector that loads YOLOv8n once, then scores frames.
 * Returns null when the session cannot be created (missing weights / wasm).
 */
export async function createYoloOnnxDetector(): Promise<ObjectDetector | null> {
  const session = await loadSession()
  if (!session) return null
  const ort = await loadOrt()

  return {
    displayName: 'YOLOv8n',
    demo: false,
    async detect(frame: DetectionFrame): Promise<readonly Detection[]> {
      const source = frame.source
      if (!source) return []

      try {
        let canvas: HTMLCanvasElement
        let scale: number
        let padX: number
        let padY: number
        let srcW: number
        let srcH: number

        if (source instanceof ImageData) {
          const c = document.createElement('canvas')
          c.width = source.width
          c.height = source.height
          c.getContext('2d')?.putImageData(source, 0, 0)
          const boxed = letterbox(c, INPUT)
          canvas = boxed.canvas
          scale = boxed.scale
          padX = boxed.padX
          padY = boxed.padY
          srcW = source.width
          srcH = source.height
        } else {
          const boxed = letterbox(source, INPUT)
          canvas = boxed.canvas
          scale = boxed.scale
          padX = boxed.padX
          padY = boxed.padY
          srcW =
            'videoWidth' in source && source.videoWidth
              ? source.videoWidth
              : 'naturalWidth' in source && source.naturalWidth
                ? source.naturalWidth
                : canvas.width
          srcH =
            'videoHeight' in source && source.videoHeight
              ? source.videoHeight
              : 'naturalHeight' in source && source.naturalHeight
                ? source.naturalHeight
                : canvas.height
        }

        const ctx = canvas.getContext('2d')
        if (!ctx) return []
        const imageData = ctx.getImageData(0, 0, INPUT, INPUT)
        const inputName = session.inputNames[0] ?? 'images'
        const feeds = { [inputName]: imageDataToTensor(imageData, ort) }
        const results = await session.run(feeds)
        const outName = session.outputNames[0]
        if (!outName) return []
        const tensor = results[outName]
        if (!tensor) return []
        return decodeYolo(tensor, { scale, padX, padY, srcW, srcH })
      } catch {
        return []
      }
    },
  }
}

/** Reset caches — tests only. */
export function resetYoloSessionForTests(): void {
  ortPromise = null
  sessionPromise = null
}
