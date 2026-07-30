import type { DroneVitals } from './vitals'

/**
 * Fleet-wide averages for a glanceable classroom summary on Control.
 *
 * Mean height uses airborne craft with a reported altitude only — grounded Drones at 0 m
 * would drag the average down without telling the Teacher anything about the lesson in the air.
 * Readiness is the share of the Fleet that reads Ready on the status Ready.
 */
export function classAverageStats(vitals: readonly DroneVitals[]): {
  readonly meanHeightM: number | null
  readonly readyCount: number
  readonly total: number
} {
  const total = vitals.length
  if (total === 0) {
    return { meanHeightM: null, readyCount: 0, total: 0 }
  }

  const airborneWithHeight = vitals.filter(
    (entry) => entry.airborne && entry.altitudeM !== null,
  )
  const meanHeightM =
    airborneWithHeight.length > 0
      ? airborneWithHeight.reduce((sum, entry) => sum + entry.altitudeM!, 0) /
        airborneWithHeight.length
      : null

  const readyCount = vitals.filter((entry) => entry.status === 'Ready').length

  return { meanHeightM, readyCount, total }
}
