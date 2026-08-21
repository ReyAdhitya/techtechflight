/**
 * The address the iPads type, printed and drawn as a QR code.
 *
 * Nobody types an IP in front of a class. The launcher prints this once, the Teacher holds the
 * laptop up or tapes the card to the trolley, and every iPad points a camera at it.
 *
 * No dependency: the QR is generated here, because a school laptop must not need `npm install`
 * to show a square, and the alternative was a network round trip to a chart service on a
 * network that by design has no internet.
 */
import { networkInterfaces } from 'node:os'

const PORT = Number(process.argv[2] ?? 4321)

/**
 * The address a device on the same router can reach, or null.
 *
 * IPv4, not internal, and preferring a private range because that is what a travel router
 * hands out. A laptop with a VPN up can carry several; the private one is the one the room
 * is on.
 */
export function classroomAddress() {
  const candidates = []
  for (const [name, addresses] of Object.entries(networkInterfaces())) {
    for (const entry of addresses ?? []) {
      if (entry.family !== 'IPv4' || entry.internal) continue
      candidates.push({ name, address: entry.address })
    }
  }
  const privateFirst = candidates.filter((entry) =>
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(entry.address),
  )
  return (privateFirst[0] ?? candidates[0])?.address ?? null
}

// ---------------------------------------------------------------- the QR code
//
// Byte mode, version chosen by length, error correction L. Enough for a short URL and no more,
// which is all this has to draw.

const GF_EXP = new Array(512)
const GF_LOG = new Array(256)
for (let i = 0, x = 1; i < 255; i += 1) {
  GF_EXP[i] = x
  GF_LOG[x] = i
  x <<= 1
  if (x & 0x100) x ^= 0x11d
}
for (let i = 255; i < 512; i += 1) GF_EXP[i] = GF_EXP[i - 255]

const mul = (a, b) => (a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]])

function generatorPoly(degree) {
  let poly = [1]
  for (let i = 0; i < degree; i += 1) {
    const next = new Array(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j]
      next[j + 1] ^= mul(poly[j], GF_EXP[i])
    }
    poly = next
  }
  return poly
}

function errorCorrection(data, count) {
  const gen = generatorPoly(count)
  const remainder = new Array(count).fill(0)
  for (const byte of data) {
    const factor = byte ^ remainder[0]
    remainder.shift()
    remainder.push(0)
    for (let i = 0; i < count; i += 1) remainder[i] ^= mul(gen[i + 1], factor)
  }
  return remainder
}

/** Version, total codewords, error-correction codewords per block, at level L. */
const VERSIONS = [
  { version: 2, size: 25, total: 44, ec: 10, capacity: 32 },
  { version: 3, size: 29, total: 70, ec: 15, capacity: 53 },
  { version: 4, size: 33, total: 100, ec: 20, capacity: 78 },
]

const ALIGNMENT = { 2: [6, 18], 3: [6, 22], 4: [6, 26] }

function pickVersion(length) {
  const chosen = VERSIONS.find((entry) => length + 2 <= entry.capacity)
  if (!chosen) throw new Error('address too long for this QR encoder')
  return chosen
}

function encode(text) {
  const bytes = [...Buffer.from(text, 'utf8')]
  const spec = pickVersion(bytes.length)

  const bits = []
  const push = (value, count) => {
    for (let i = count - 1; i >= 0; i -= 1) bits.push((value >> i) & 1)
  }
  push(0b0100, 4)
  push(bytes.length, 8)
  for (const byte of bytes) push(byte, 8)

  const dataCodewords = spec.total - spec.ec
  push(0, Math.min(4, dataCodewords * 8 - bits.length))
  while (bits.length % 8 !== 0) bits.push(0)

  const data = []
  for (let i = 0; i < bits.length; i += 8) {
    data.push(bits.slice(i, i + 8).reduce((byte, bit) => (byte << 1) | bit, 0))
  }
  const PAD = [0xec, 0x11]
  while (data.length < dataCodewords) data.push(PAD[data.length % 2])

  return { spec, codewords: [...data, ...errorCorrection(data, spec.ec)] }
}

function blankMatrix(size) {
  return Array.from({ length: size }, () => new Array(size).fill(null))
}

function place(matrix, x, y, value) {
  if (matrix[y] === undefined || matrix[y][x] === undefined) return
  matrix[y][x] = value
}

function finder(matrix, x0, y0) {
  for (let y = -1; y <= 7; y += 1) {
    for (let x = -1; x <= 7; x += 1) {
      const edge = x === -1 || x === 7 || y === -1 || y === 7
      const ring = x >= 0 && x <= 6 && y >= 0 && y <= 6
      const dark =
        ring && (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4))
      if (edge || ring) place(matrix, x0 + x, y0 + y, dark ? 1 : 0)
    }
  }
}

function buildMatrix(spec, codewords) {
  const { size, version } = spec
  const matrix = blankMatrix(size)

  finder(matrix, 0, 0)
  finder(matrix, size - 7, 0)
  finder(matrix, 0, size - 7)

  for (let i = 8; i < size - 8; i += 1) {
    const dark = i % 2 === 0 ? 1 : 0
    place(matrix, i, 6, dark)
    place(matrix, 6, i, dark)
  }

  for (const cy of ALIGNMENT[version]) {
    for (const cx of ALIGNMENT[version]) {
      if ((cx === 6 && cy === 6) || (cx === 6 && cy === size - 7) || (cx === size - 7 && cy === 6)) {
        continue
      }
      for (let y = -2; y <= 2; y += 1) {
        for (let x = -2; x <= 2; x += 1) {
          const dark = Math.max(Math.abs(x), Math.abs(y)) !== 1 ? 1 : 0
          place(matrix, cx + x, cy + y, dark)
        }
      }
    }
  }

  place(matrix, 8, size - 8, 1)

  /* Format information, level L with mask 0, precomputed. */
  const FORMAT = 0b111011111000100
  const formatBit = (i) => (FORMAT >> i) & 1
  for (let i = 0; i <= 5; i += 1) place(matrix, 8, i, formatBit(i))
  place(matrix, 8, 7, formatBit(6))
  place(matrix, 8, 8, formatBit(7))
  place(matrix, 7, 8, formatBit(8))
  for (let i = 9; i < 15; i += 1) place(matrix, 14 - i, 8, formatBit(i))
  for (let i = 0; i < 8; i += 1) place(matrix, size - 1 - i, 8, formatBit(i))
  for (let i = 8; i < 15; i += 1) place(matrix, 8, size - 15 + i, formatBit(i))

  const bits = []
  for (const byte of codewords) for (let i = 7; i >= 0; i -= 1) bits.push((byte >> i) & 1)

  let index = 0
  let upward = true
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right -= 1
    for (let step = 0; step < size; step += 1) {
      const y = upward ? size - 1 - step : step
      for (const x of [right, right - 1]) {
        if (matrix[y][x] !== null) continue
        const bit = index < bits.length ? bits[index] : 0
        index += 1
        /* Mask 0: invert where (row + column) is even. */
        matrix[y][x] = (y + x) % 2 === 0 ? bit ^ 1 : bit
      }
    }
    upward = !upward
  }

  return matrix
}

/** The QR as two rows of blocks per text line, which is what a console can draw. */
export function qrLines(text) {
  const { spec, codewords } = encode(text)
  const matrix = buildMatrix(spec, codewords)
  const size = spec.size
  const dark = (x, y) => (x < 0 || y < 0 || x >= size || y >= size ? 0 : matrix[y][x])

  const lines = []
  const QUIET = 2
  for (let y = -QUIET; y < size + QUIET; y += 2) {
    let line = ''
    for (let x = -QUIET; x < size + QUIET; x += 1) {
      const top = dark(x, y)
      const bottom = dark(x, y + 1)
      line += top && bottom ? '█' : top ? '▀' : bottom ? '▄' : ' '
    }
    lines.push(line)
  }
  return lines
}

// ------------------------------------------------------------------ the print
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const address = classroomAddress()
  if (address === null) {
    console.log('  No network address yet. Plug into the classroom router, then run again.')
    console.log('  The board still works on this laptop: http://localhost:%d', PORT)
  } else {
    const url = `http://${address}:${PORT}`
    console.log('')
    console.log('  The iPads open this address:')
    console.log('')
    console.log(`      ${url}`)
    console.log('')
    for (const line of qrLines(url)) console.log(`  ${line}`)
    console.log('')
    console.log('  Point an iPad camera at the square, or type the address.')
    console.log('  This laptop uses http://localhost:%d, which is what keeps the camera working.', PORT)
    console.log('')
  }
}
