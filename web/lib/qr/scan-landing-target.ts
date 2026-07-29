import type { QrDecoder } from './decoder'
import { parseLandingTarget, type LandingTarget } from './landing-target'

/**
 * How the camera surface obtains pixels to scan.
 *
 * Display-only by default: finding a landing target never writes Telemetry.
 * A simulated Fleet may later offer an explicit ScenarioControl that calls
 * `setPosition` — that button is elsewhere, and hardware (`scenarios === null`)
 * never gets one (C9).
 */
export interface LandingTargetScanner {
  scan(): Promise<LandingTarget | null>
}

export function createImageDataScanner(
  imageData: ImageData,
  decoder: QrDecoder,
): LandingTargetScanner {
  return {
    async scan(): Promise<LandingTarget | null> {
      return firstLandingTarget(decoder.decode(imageData))
    },
  }
}

/**
 * Load a same-origin picture, decode QR codes, keep the first landing marker.
 *
 * Used for the sim fixture today; a school stream frame can use the same path
 * once #50 supplies real pixels.
 */
export function createUrlScanner(url: string, decoder: QrDecoder): LandingTargetScanner {
  return {
    async scan(): Promise<LandingTarget | null> {
      const image = await imageDataFromUrl(url)
      return firstLandingTarget(decoder.decode(image))
    },
  }
}

export function firstLandingTarget(
  hits: readonly { readonly raw: string }[],
): LandingTarget | null {
  for (const hit of hits) {
    const target = parseLandingTarget(hit.raw)
    if (target) return target
  }
  return null
}

export async function imageDataFromUrl(url: string): Promise<ImageData> {
  const img = new Image()
  img.src = url
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Could not read camera pixels for QR scan — no 2d context')
  }
  ctx.drawImage(img, 0, 0)
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}
