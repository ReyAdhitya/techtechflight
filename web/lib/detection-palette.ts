/**
 * Colour per recognised class on the camera overlay.
 *
 * The word on the chip always carries the class name (ADR-0004) — the hue is so a Teacher
 * can tell two boxes apart at a glance across the room. `person` is purple by request;
 * everything else is a fixed, high-chroma palette so neighbouring classes do not collide.
 */

export interface DetectionSwatch {
  /** Box border and chip fill. */
  readonly fill: string
  /** Text on the chip — always high contrast against `fill`. */
  readonly text: string
}

/** Named classes a classroom actually sees, plus a few that show up on desks. */
const NAMED: Readonly<Record<string, DetectionSwatch>> = {
  person: { fill: '#7c3aed', text: '#ffffff' },
  bicycle: { fill: '#0891b2', text: '#ffffff' },
  car: { fill: '#2563eb', text: '#ffffff' },
  motorcycle: { fill: '#0d9488', text: '#ffffff' },
  bus: { fill: '#1d4ed8', text: '#ffffff' },
  truck: { fill: '#4338ca', text: '#ffffff' },
  bird: { fill: '#16a34a', text: '#ffffff' },
  cat: { fill: '#ea580c', text: '#ffffff' },
  dog: { fill: '#c2410c', text: '#ffffff' },
  backpack: { fill: '#ca8a04', text: '#1a1410' },
  umbrella: { fill: '#db2777', text: '#ffffff' },
  handbag: { fill: '#be185d', text: '#ffffff' },
  bottle: { fill: '#059669', text: '#ffffff' },
  cup: { fill: '#d97706', text: '#1a1410' },
  bowl: { fill: '#b45309', text: '#ffffff' },
  chair: { fill: '#65a30d', text: '#1a1410' },
  couch: { fill: '#4d7c0f', text: '#ffffff' },
  'potted plant': { fill: '#15803d', text: '#ffffff' },
  'dining table': { fill: '#a16207', text: '#ffffff' },
  tv: { fill: '#4f46e5', text: '#ffffff' },
  laptop: { fill: '#6366f1', text: '#ffffff' },
  mouse: { fill: '#818cf8', text: '#1a1410' },
  remote: { fill: '#a855f7', text: '#ffffff' },
  keyboard: { fill: '#7e22ce', text: '#ffffff' },
  'cell phone': { fill: '#c026d3', text: '#ffffff' },
  book: { fill: '#e11d48', text: '#ffffff' },
  clock: { fill: '#f59e0b', text: '#1a1410' },
  scissors: { fill: '#dc2626', text: '#ffffff' },
  'teddy bear': { fill: '#f472b6', text: '#1a1410' },
  sports: { fill: '#14b8a6', text: '#1a1410' },
  'sports ball': { fill: '#14b8a6', text: '#1a1410' },
}

/** Fallback hues for any COCO class not in the named table — stable per label. */
const FALLBACK_HUES = [200, 25, 140, 320, 45, 170, 280, 10, 95, 230] as const

function hashLabel(label: string): number {
  let h = 0
  for (let i = 0; i < label.length; i += 1) h = (h * 31 + label.charCodeAt(i)) >>> 0
  return h
}

/** Swatch for a detector label. Unknown labels get a stable colour from the string. */
export function swatchForLabel(label: string): DetectionSwatch {
  const named = NAMED[label.toLowerCase()]
  if (named) return named

  const hue = FALLBACK_HUES[hashLabel(label) % FALLBACK_HUES.length]!
  return { fill: `hsl(${hue} 70% 42%)`, text: '#ffffff' }
}
