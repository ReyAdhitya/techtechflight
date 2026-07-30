/** Assumed flight time from a full charge — naive classroom rule of thumb. */
export const FULL_CHARGE_FLIGHT_MINUTES = 12

/** Fraction below which the lesson pre-flight warns (~20% of a full charge). */
export const LOW_BUDGET_FRACTION = 0.2

/**
 * Estimated minutes left from charge alone.
 *
 * Naive formula documented in DECISIONS: minutes ≈ batteryFraction × 12. No discharge
 * slope, no temperature — just enough for a Teacher to eyeball whether a lesson fits.
 */
export function estimatedFlightMinutes(batteryFraction: number): number {
  return batteryFraction * FULL_CHARGE_FLIGHT_MINUTES
}

export function isLowBatteryBudget(batteryFraction: number | null): boolean {
  if (batteryFraction === null) return false
  return batteryFraction < LOW_BUDGET_FRACTION
}

/** Time budget in words, rounded so it never promises more than the formula gives. */
export function formatBatteryTimeBudget(batteryFraction: number): string {
  const minutes = estimatedFlightMinutes(batteryFraction)
  if (minutes < 1) return 'under a minute left'
  const rounded = Math.round(minutes)
  if (rounded === 1) return 'about 1 min left'
  return `about ${rounded} min left`
}
