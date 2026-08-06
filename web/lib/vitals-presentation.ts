import type { LocalPosition } from '@techtechflight/contract'
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

/**
 * Height with its direction attached, because a number alone does not say what next.
 *
 * This used to give nothing at all for a Drone on the ground, on the reasoning that the phase
 * word beside it already said "On the ground" and a second cell would print the fact twice.
 * **The phase word is gone**, so that reasoning went with it: the cell now speaks for a
 * grounded Drone rather than leaving the strip silent about where it is.
 *
 * A grounded Drone gets its height and nothing else — no arrow, and no "steady" either, which
 * would be a measurement of stillness where a plain fact belongs. `airborne` is read from the
 * airframe rather than from phase, because a latched emergency stop resolves to `emergency`
 * whether the Drone is on a desk or falling out of the air.
 *
 * `null` survives for one case only: an airframe that cannot measure height at all is a
 * different fact from one measuring zero (`docs/DESIGN.md` §11.1), and it is said in words.
 */
export function formatVerticalMovement(vitals: DroneVitals): string | null {
  if (vitals.altitudeM === null) return 'Height not reported'
  const height = `${vitals.altitudeM.toFixed(1)} m`
  if (!vitals.airborne) return height
  if (vitals.verticalRateMps === null) return height
  if (Math.abs(vitals.verticalRateMps) < 0.05) return `${height}, steady`
  const arrow = vitals.verticalRateMps > 0 ? '↑' : '↓'
  return `${height}, ${arrow} ${Math.abs(vitals.verticalRateMps).toFixed(1)} m/s`
}

/**
 * Where a Drone is, as three numbers a Teacher can read out loud.
 *
 * `null` when the Drone has said nothing about its position. The caller renders no line at
 * all in that case rather than a row of dashes — a coordinate group full of placeholders
 * reads as a measurement that failed, when the truth is that none was offered.
 *
 * Each axis carries its letter **and** its direction, so `X`, `Y` and `Z` are learnable
 * without being the only key to what they mean. A Teacher who has never been told which is
 * which can still read `2.4 m E` and act on it.
 *
 * Two rules the format exists to keep:
 *
 * - **A height that was never reported is said in words.** `Z not reported` and never `0.0`.
 *   An airframe with no barometer and one sitting on the floor are different facts, and
 *   `docs/DESIGN.md` §11.1 requires them to be drawn differently. A Drone that genuinely
 *   measures zero shows `Z 0.0 m`, which is a reading.
 * - **A direction is only claimed where there is one.** At exactly zero the letter is
 *   dropped — 0 m east and 0 m west are the same place, and picking one would be noise
 *   dressed as precision.
 *
 * One decimal, because `simulated-telemetry-source.ts` rounds to two and a third digit would
 * be precision the Telemetry has not got.
 */
export function formatCoordinates(reading: {
  /** `DroneVitals` says `null` where `Telemetry` says nothing at all; both mean the same. */
  readonly position?: LocalPosition | null
  readonly altitudeM?: number | null
}): string | null {
  const position = reading.position
  if (position === null || position === undefined) return null

  const axis = (metres: number, positive: string, negative: string) => {
    const magnitude = Math.abs(metres).toFixed(1)
    if (Math.abs(metres) < 0.05) return `${magnitude} m`
    return `${magnitude} m ${metres > 0 ? positive : negative}`
  }

  const altitudeM = reading.altitudeM
  const height =
    altitudeM === null || altitudeM === undefined
      ? 'Z not reported'
      : `Z ${altitudeM.toFixed(1)} m`

  return [
    `X ${axis(position.eastM, 'E', 'W')}`,
    `Y ${axis(position.northM, 'N', 'S')}`,
    height,
  ].join(', ')
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
