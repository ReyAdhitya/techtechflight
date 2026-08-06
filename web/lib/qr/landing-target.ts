/**
 * A QR code that answers "where should this aircraft land?"
 *
 * Owner clarification on #51: this is landing targeting, not a free-form inventory
 * scanner. Only payloads that declare a landing pad are recognised; anything else
 * is ignored so a random classroom sticker never becomes a Telemetry rewrite.
 *
 * Classroom metres use the same local frame as Fleet position (`eastM` / `northM`).
 * Parsing here never writes Telemetry — display first; any sim pose write is an
 * explicit ScenarioControl elsewhere (C9).
 */

export type LandingTarget =
  | {
      readonly kind: 'identity'
      readonly id: string
      readonly raw: string
    }
  | {
      readonly kind: 'pose'
      readonly id: string
      readonly eastM: number
      readonly northM: number
      readonly raw: string
    }

const LANDING_PREFIX = 'ttf-land:'

/**
 * Turn a decoded QR string into a landing target, or null when it is not one.
 *
 * Forms:
 * - `ttf-land:<id>` — pad identity only
 * - `ttf-land:<id>;east=<m>;north=<m>` — pad identity plus classroom pose
 */
export function parseLandingTarget(raw: string): LandingTarget | null {
  const trimmed = raw.trim()
  if (!trimmed.startsWith(LANDING_PREFIX)) return null

  const body = trimmed.slice(LANDING_PREFIX.length)
  if (body.length === 0) return null

  const [idPart, ...params] = body.split(';')
  const id = idPart?.trim() ?? ''
  if (id.length === 0 || id.includes('=')) return null

  let eastM: number | undefined
  let northM: number | undefined

  for (const param of params) {
    const eq = param.indexOf('=')
    if (eq <= 0) return null
    const key = param.slice(0, eq).trim()
    const value = param.slice(eq + 1).trim()
    if (key === 'east') {
      eastM = Number(value)
      if (!Number.isFinite(eastM)) return null
    } else if (key === 'north') {
      northM = Number(value)
      if (!Number.isFinite(northM)) return null
    } else {
      return null
    }
  }

  const hasEast = eastM !== undefined
  const hasNorth = northM !== undefined
  if (hasEast !== hasNorth) return null

  if (hasEast && hasNorth) {
    return { kind: 'pose', id, eastM: eastM!, northM: northM!, raw: trimmed }
  }

  return { kind: 'identity', id, raw: trimmed }
}

/** Teacher-facing copy for a recognised landing pad. */
export function landingTargetPresentation(target: LandingTarget): {
  readonly title: string
  readonly meaning: string
} {
  const label = target.id
  if (target.kind === 'pose') {
    return {
      title: `Landing target: ${label}`,
      meaning: `Where to land, east ${formatMetres(target.eastM)}, north ${formatMetres(target.northM)}`,
    }
  }
  return {
    title: `Landing target: ${label}`,
    meaning: 'Where to land. Pad identity only (no classroom metres in the code)',
  }
}

function formatMetres(metres: number): string {
  const rounded = Number.isInteger(metres) ? String(metres) : metres.toFixed(1)
  return `${rounded} m`
}
