import type { FleetThresholds } from '@techtechflight/contract'

/**
 * Forecasting when a Not Ready Drone will be usable again.
 *
 * The rule this module exists to enforce is that a forecast is only ever made from
 * charge the ground station has actually watched go in. Nothing here asks a Drone
 * whether it is on a charger, because no Telemetry Source is known to be able to answer
 * that, and a question the hardware cannot answer is not a foundation to build a number
 * on. Rising battery over several readings is evidence; everything else is silence.
 *
 * That makes the feature honest under either way a School might run its Fleet. Where
 * batteries charge in place the readings rise and a forecast appears. Where batteries
 * are swapped out for charged ones the readings never rise gradually, so no forecast is
 * ever made and the board simply says nothing — which is the truth, since the charger
 * is a device no Drone can see.
 */

/** One battery reading, kept only long enough to tell charging apart from noise. */
export interface ChargeSample {
  readonly at: number
  readonly batteryFraction: number
}

export interface ChargeForecastOptions {
  /** Readings older than this are dropped, so a forecast follows the recent trend only. */
  readonly windowMs: number
  /** Readings have to span at least this long before a rate derived from them means anything. */
  readonly minSpanMs: number
  /**
   * A rise larger than this between two consecutive readings is a swapped battery, not
   * charge going in. The window restarts rather than extrapolating: how fast the old
   * battery filled says nothing about the new one, and the jump itself is not a rate.
   */
  readonly swapRiseFraction: number
  /** Net rise across the window below this is sensor noise rather than charging. */
  readonly minRiseFraction: number
  /**
   * Beyond this the forecast stops being useful to someone with a lesson starting, and
   * the further out it reaches the more the extrapolation is fiction. We say nothing.
   */
  readonly maxForecastMs: number
}

export const DEFAULT_CHARGE_FORECAST: ChargeForecastOptions = {
  windowMs: 120_000,
  minSpanMs: 20_000,
  swapRiseFraction: 0.15,
  minRiseFraction: 0.01,
  maxForecastMs: 90 * 60_000,
}

/**
 * Add a reading, dropping whatever has aged out of the window.
 *
 * Returns a new history rather than mutating one, so a caller holding the previous
 * array keeps a value that is still true.
 */
export function recordCharge(
  history: readonly ChargeSample[],
  sample: ChargeSample,
  options: ChargeForecastOptions = DEFAULT_CHARGE_FORECAST,
): readonly ChargeSample[] {
  const previous = history.at(-1)

  // A battery that jumped is a different battery. Nothing learned about the old one
  // predicts the new one, so the window starts again from this reading.
  if (previous && sample.batteryFraction - previous.batteryFraction > options.swapRiseFraction) {
    return [sample]
  }

  return [...history, sample].filter((kept) => sample.at - kept.at <= options.windowMs)
}

/**
 * How long until this Drone reaches a usable charge, or null when nothing can be said.
 *
 * Null is the answer to every question this cannot answer confidently — too few
 * readings, too short a span, a battery that is flat or falling, a Drone already charged
 * enough, or a forecast so distant it is guesswork. Callers show nothing on null rather
 * than showing a hedge, because a Teacher reading "Ready in ~4 hr" learns less than a
 * Teacher reading nothing at all.
 */
export function forecastTimeToReady(
  history: readonly ChargeSample[],
  thresholds: FleetThresholds,
  options: ChargeForecastOptions = DEFAULT_CHARGE_FORECAST,
): number | null {
  const oldest = history[0]
  const newest = history.at(-1)
  if (!oldest || !newest || oldest === newest) return null

  const spanMs = newest.at - oldest.at
  if (spanMs < options.minSpanMs) return null

  const rise = newest.batteryFraction - oldest.batteryFraction
  if (rise < options.minRiseFraction) return null

  // Already charged enough. It will read Ready on its own at the next derivation, and a
  // countdown to a moment that has arrived is noise.
  const shortfall = thresholds.usableBatteryFraction - newest.batteryFraction
  if (shortfall <= 0) return null

  const remainingMs = shortfall / (rise / spanMs)
  if (remainingMs > options.maxForecastMs) return null

  // Rounded to the minute it is displayed in. An extrapolation does not deserve second
  // precision, and a value that changed every tick would republish the whole Fleet
  // without a Teacher ever seeing it change.
  return Math.max(1, Math.round(remainingMs / 60_000)) * 60_000
}
