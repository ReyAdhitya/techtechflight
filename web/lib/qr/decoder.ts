import jsQR from 'jsqr'

/**
 * QR decoding behind a small seam so CameraPane tests can inject a mock, and so
 * the library choice (jsQR today) is not glued into the Teacher surface.
 *
 * A hit is raw text only — positioning meaning lives in `parseLandingTarget`.
 */

export interface QrCodeHit {
  readonly raw: string
}

export interface QrDecoder {
  decode(image: ImageData): readonly QrCodeHit[]
}

export function createJsQrDecoder(): QrDecoder {
  return {
    decode(image: ImageData): readonly QrCodeHit[] {
      const code = jsQR(image.data, image.width, image.height, {
        // Classroom stickers are printed dark-on-light; skip the invert hunt.
        inversionAttempts: 'dontInvert',
      })
      if (!code || code.data.length === 0) return []
      return [{ raw: code.data }]
    },
  }
}
