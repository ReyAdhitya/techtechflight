/**
 * Fetch everything in-browser detection needs, and put it where the board serves it.
 *
 * Two things, both deliberately absent from the repository:
 *
 * 1. **The YOLOv8n weights** (~12 MB) into `web/public/models/`. Too large to keep in git,
 *    so a fresh checkout has no model and the board falls back to the demo detector.
 * 2. **The onnxruntime WebAssembly runtime**, copied out of `node_modules` into
 *    `web/public/ort/`. It used to load from a CDN, which meant detection silently
 *    degraded in any classroom without internet — the exact condition ADR-0002 says this
 *    product is built for, and a failure that looked like success because the demo
 *    detector kept drawing boxes.
 *
 * Run: node scripts/fetch-yolo-model.mjs   (or `npm run fetch:yolo`)
 */
import {
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/* --- 1. The weights ------------------------------------------------------------- */

const out = join(root, 'web/public/models/yolov8n.onnx')
const url =
  'https://raw.githubusercontent.com/Hyuto/yolov8-onnxruntime-web/master/public/model/yolov8n.onnx'

mkdirSync(dirname(out), { recursive: true })
if (existsSync(out) && statSync(out).size > 1_000_000) {
  console.log(`already present: ${out} (${statSync(out).size} bytes)`)
} else {
  console.log(`fetching ${url}`)
  const res = await fetch(url)
  if (!res.ok || !res.body) {
    console.error(`download failed: ${res.status}`)
    process.exit(1)
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(out))
  console.log(`wrote ${out} (${statSync(out).size} bytes)`)
}

/* --- 2. The WebAssembly runtime --------------------------------------------------- */

/*
 * Copied from `node_modules` rather than downloaded, so the runtime always matches the
 * `onnxruntime-web` the board was built against. A version skew between the two fails at
 * load with a message about a magic number, which is not a thing anyone should have to
 * decode in a classroom.
 */
const ortDist = join(root, 'node_modules/onnxruntime-web/dist')
const ortOut = join(root, 'web/public/ort')

if (!existsSync(ortDist)) {
  console.error(`onnxruntime-web is not installed — run npm install first (${ortDist})`)
  process.exit(1)
}

mkdirSync(ortOut, { recursive: true })

/*
 * One variant, and its loader.
 *
 * `onnxruntime-web` ships four — plain, jsep, asyncify and jspi — totalling 77 MB, and
 * copying all of them is 64 MB nobody downloads on purpose. Which one is needed is **not**
 * a matter of taste: the package's main entry point decides, and at 1.27 it is the jsep
 * build even when the board asks only for `executionProviders: ['wasm']`.
 *
 * Getting this wrong fails in the worst available way — the missing file 404s, session
 * creation throws, `boardDetector()` falls back to the demo detector, and the board draws
 * confident invented boxes. It looks like it is working.
 *
 * To check after an upgrade, build the board and read what it asks for:
 *   grep -rho "ort-wasm[a-z0-9.-]*" web/out/_next/static/chunks | sort -u
 */
const BASE = 'ort-wasm-simd-threaded.jsep'
const wanted = readdirSync(ortDist).filter(
  (name) => name === `${BASE}.wasm` || name === `${BASE}.mjs`,
)

if (wanted.length < 2) {
  console.error(`expected ${BASE}.wasm and ${BASE}.mjs in ${ortDist} — has the layout changed?`)
  process.exit(1)
}

let copied = 0
for (const name of wanted) {
  const from = join(ortDist, name)
  const to = join(ortOut, name)
  if (existsSync(to) && statSync(to).size === statSync(from).size) continue
  copyFileSync(from, to)
  copied += 1
}

console.log(
  copied === 0
    ? `runtime already present: ${ortOut} (${wanted.length} files)`
    : `copied ${copied} of ${wanted.length} runtime files into ${ortOut}`,
)
console.log('Detection will now run offline. Reload the board.')
