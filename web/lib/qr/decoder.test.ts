import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { createJsQrDecoder } from './decoder'
import { firstLandingTarget } from './scan-landing-target'
import { SIM_LANDING_QR_PAYLOAD } from './sim-fixture'

/**
 * jsQR behind the decoder seam — paint a real QR matrix into ImageData so the
 * gate does not depend on jsdom's canvas or a PNG loader.
 */

const require = createRequire(import.meta.url)
// qrcode ships without types; the create() surface is stable and tiny.
const QRCode = require('qrcode') as {
  create: (
    text: string,
    options: { errorCorrectionLevel: string },
  ) => { modules: { size: number; get: (row: number, col: number) => boolean } }
}

function imageDataForPayload(payload: string): ImageData {
  const qr = QRCode.create(payload, { errorCorrectionLevel: 'M' })
  const moduleCount = qr.modules.size
  const scale = 8
  const quiet = 4 * scale
  const width = moduleCount * scale + quiet * 2
  const data = new Uint8ClampedArray(width * width * 4)

  for (let y = 0; y < width; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const mx = Math.floor((x - quiet) / scale)
      const my = Math.floor((y - quiet) / scale)
      const inModules = mx >= 0 && my >= 0 && mx < moduleCount && my < moduleCount
      const dark = inModules && qr.modules.get(my, mx)
      const tone = dark ? 0 : 255
      data[i] = tone
      data[i + 1] = tone
      data[i + 2] = tone
      data[i + 3] = 255
    }
  }

  return {
    data,
    width,
    height: width,
    colorSpace: 'srgb',
  } as ImageData
}

describe('the jsQR decoder', () => {
  it('reads a landing-pad payload from painted pixels', () => {
    const decoder = createJsQrDecoder()
    const hits = decoder.decode(imageDataForPayload(SIM_LANDING_QR_PAYLOAD))
    expect(hits.map((hit) => hit.raw)).toEqual([SIM_LANDING_QR_PAYLOAD])
    expect(firstLandingTarget(hits)).toEqual({
      kind: 'pose',
      id: 'pad-A',
      eastM: 2,
      northM: 1,
      raw: SIM_LANDING_QR_PAYLOAD,
    })
  })

  it('stays quiet when the picture has no code', () => {
    const decoder = createJsQrDecoder()
    const blank = {
      data: new Uint8ClampedArray(16 * 16 * 4).fill(255),
      width: 16,
      height: 16,
      colorSpace: 'srgb',
    } as ImageData
    expect(decoder.decode(blank)).toEqual([])
  })
})
