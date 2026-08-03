import type { DroneState } from '@techtechflight/contract'
import { isUsable } from '@techtechflight/contract'

/**
 * When the charging craft will join those already Ready — one line for the whole set.
 *
 * Built only from `timeToReadyMs` the ground station has already inferred from observed
 * charge (ADR-0007). No rate is invented here. Null is the resting answer: pack swaps,
 * silence, or a Fleet that is not charging all leave this quiet rather than guessing.
 */

export interface FleetReadyForecast {
  /** Ready now, plus every craft with an honest charge forecast. */
  readonly readyCount: number
  /** Minutes until the slowest forecasted craft joins — rounded, never sub-minute. */
  readonly minutes: number
}

/**
 * Fleet-level charge-to-ready, or null when no honest forecast exists.
 *
 * Count = Drones already Ready + Drones carrying a non-null `timeToReadyMs`. Minutes =
 * the longest of those forecasts, rounded the same way a single tile rounds
 * (`formatTimeToReady`). Without at least one forecast the line stays absent — already
 * Ready alone is FleetSummary's job, not this one's.
 */
export function fleetReadyCountdown(
  drones: readonly Pick<DroneState, 'status' | 'timeToReadyMs'>[],
): FleetReadyForecast | null {
  const forecasts: number[] = []
  for (const drone of drones) {
    if (drone.timeToReadyMs !== null) forecasts.push(drone.timeToReadyMs)
  }
  if (forecasts.length === 0) return null

  const alreadyReady = drones.filter((drone) => isUsable(drone.status)).length
  const longestMs = Math.max(...forecasts)
  const minutes = Math.max(1, Math.round(longestMs / 60_000))

  return {
    readyCount: alreadyReady + forecasts.length,
    minutes,
  }
}

/** Teacher-facing line: "6 ready in 12 minutes". */
export function formatFleetReadyCountdown(forecast: FleetReadyForecast): string {
  const minuteWord = forecast.minutes === 1 ? 'minute' : 'minutes'
  return `${forecast.readyCount} ready in ${forecast.minutes} ${minuteWord}`
}
