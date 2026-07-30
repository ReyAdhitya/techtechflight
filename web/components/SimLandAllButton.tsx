'use client'

/**
 * Bring every airborne craft down on a simulated Fleet.
 *
 * Uses ScenarioControls.setAltitude — not a Command (ADR-0011 / C9). Absent on hardware
 * Fleets because there is nothing here that can invent altitude for real aircraft.
 */
export function SimLandAllButton({
  airborne,
  onLandAll,
}: {
  airborne: number
  onLandAll: () => void
}) {
  if (airborne === 0) return null

  return (
    <button
      type="button"
      onClick={onLandAll}
      className="min-h-11 cursor-pointer rounded-pill border border-status-fault bg-transparent px-4 py-1.5 text-value text-status-fault hover:border-ink hover:text-ink"
    >
      Land all (sim)
    </button>
  )
}
