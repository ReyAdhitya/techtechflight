/**
 * Downloads YOLOv8n ONNX weights into web/public/models/ for in-browser detection.
 * Run: node scripts/fetch-yolo-model.mjs
 */
import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'web/public/models/yolov8n.onnx')
const url =
  'https://raw.githubusercontent.com/Hyuto/yolov8-onnxruntime-web/master/public/model/yolov8n.onnx'

mkdirSync(dirname(out), { recursive: true })
if (existsSync(out) && statSync(out).size > 1_000_000) {
  console.log(`already present: ${out} (${statSync(out).size} bytes)`)
  process.exit(0)
}

console.log(`fetching ${url}`)
const res = await fetch(url)
if (!res.ok || !res.body) {
  console.error(`download failed: ${res.status}`)
  process.exit(1)
}
await pipeline(Readable.fromWeb(res.body), createWriteStream(out))
console.log(`wrote ${out} (${statSync(out).size} bytes)`)
