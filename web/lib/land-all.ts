/**
 * Land every airborne craft — the pure half of "Land all now".
 *
 * Issues the `land` Command per craft (ADR-0011: simulated Fleet only). Not
 * ScenarioControls.setAltitude — that path is `SimLandAllButton`. The Integrator
 * passes `command(id, 'land')` as `land`.
 */

export const LAND_ALL_HOLD_MS = 900

export type LandAllTarget = {
  readonly droneId: string
  readonly airborne: boolean
}

/** Craft that should receive a land Command — airborne only. */
export function airborneIdsToLand(fleet: readonly LandAllTarget[]): readonly string[] {
  return fleet.filter((entry) => entry.airborne).map((entry) => entry.droneId)
}

/**
 * Issue land to every airborne craft. Returns the ids asked, in board order.
 * Does nothing when none are up — the button should already be hidden.
 */
export function issueLandAll(
  fleet: readonly LandAllTarget[],
  land: (droneId: string) => void,
): readonly string[] {
  const ids = airborneIdsToLand(fleet)
  for (const id of ids) land(id)
  return ids
}
