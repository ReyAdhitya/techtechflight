import type { AlertSeverity, DroneVitals, FlightPhase } from './vitals'

/**
 * Vitals in words.
 *
 * Every phase and every severity carries a word of its own, so nothing on the tower
 * depends on a colour being seen (ADR-0004). A projector in a bright classroom loses
 * hue long before it loses text.
 */

export const PHASE_PRESENTATION: Readonly<
  Record<FlightPhase, { label: string; meaning: string }>
> = {
  'no-contact': {
    label: 'No contact',
    meaning: 'Nothing is responding. Its last values are all there is.',
  },
  'on-ground': { label: 'On the ground', meaning: 'Not flying.' },
  flying: { label: 'Flying', meaning: 'Up, but it has not said which way yet.' },
  climbing: { label: 'Climbing', meaning: 'Gaining height.' },
  level: { label: 'Level', meaning: 'Holding its height.' },
  descending: { label: 'Descending', meaning: 'Coming down.' },
  'auto-landing': { label: 'Auto-landing', meaning: 'Bringing itself down on its own.' },
  emergency: { label: 'Emergency stop', meaning: 'Motors cut and latched.' },
}

export const SEVERITY_PRESENTATION: Readonly<
  Record<AlertSeverity, { label: string; className: string }>
> = {
  critical: { label: 'Now', className: 'text-status-fault border-status-fault' },
  warning: { label: 'Soon', className: 'text-status-not-ready border-status-not-ready' },
  info: { label: 'Later', className: 'text-ink-muted border-hairline' },
}

/** Height with its direction attached, because a number alone does not say what next. */
export function formatVerticalMovement(vitals: DroneVitals): string | null {
  // Nothing, when the Drone is not airborne — the phase word beside this already says
  // "On the ground", and this slot echoing it printed the fact twice in the same row.
  // "0.0 m" would be worse still: a measurement where a plain fact belongs. Read from
  // the airframe rather than from phase, because a latched emergency stop resolves to
  // `emergency` whether the Drone is on a desk or falling, so phase cannot answer this.
  // The caller renders the empty cell, so the strip's columns hold their positions.
  if (!vitals.airborne) return null
  if (vitals.altitudeM === null) return 'Height not reported'
  const height = `${vitals.altitudeM.toFixed(1)} m`
  if (vitals.verticalRateMps === null) return height
  if (Math.abs(vitals.verticalRateMps) < 0.05) return `${height} · steady`
  const arrow = vitals.verticalRateMps > 0 ? '↑' : '↓'
  return `${height} · ${arrow} ${Math.abs(vitals.verticalRateMps).toFixed(1)} m/s`
}

/**
 * Beyond this, a projection from a few minutes of discharge is arithmetic rather than a
 * forecast. Saying "about 558 min left" from a nearly flat slope reads as precision the
 * reading cannot carry, and one number like that costs the Teacher's trust in all of them.
 */
export const ENDURANCE_CONFIDENT_LIMIT_MS = 60 * 60_000

/** Time left in words, rounded down so it never promises more than it can. */
export function formatEndurance(enduranceMs: number | null): string {
  if (enduranceMs === null) return 'Not enough readings to say'
  if (enduranceMs === 0) return 'Already below usable'
  if (enduranceMs >= ENDURANCE_CONFIDENT_LIMIT_MS) return 'over an hour left'
  const minutes = Math.floor(enduranceMs / 60_000)
  if (minutes < 1) return 'Under a minute'
  return `about ${minutes} min left`
}

export function formatSeparation(vitals: DroneVitals): string | null {
  if (vitals.separationM === null || vitals.conflictWith === null) return null
  return `${vitals.separationM.toFixed(1)} m from ${vitals.conflictWith}`
}
