/**
 * Stop every airborne craft — the pure half of fleet-wide Stop.
 *
 * Issues `emergency-stop` per craft. Same airborne filter as Land all; the Integrator
 * passes `command(id, 'emergency-stop')` as `stop`.
 */

import { airborneIdsToLand, type LandAllTarget } from './land-all.ts'

export type StopAllTarget = LandAllTarget

/** Craft that should receive an emergency-stop Command — airborne only. */
export function airborneIdsToStop(fleet: readonly StopAllTarget[]): readonly string[] {
  return airborneIdsToLand(fleet)
}

/**
 * Issue Stop to every airborne craft. Returns the ids asked, in board order.
 * Does nothing when none are up — the button should already be hidden.
 */
export function issueStopAll(
  fleet: readonly StopAllTarget[],
  stop: (droneId: string) => void,
): readonly string[] {
  const ids = airborneIdsToStop(fleet)
  for (const id of ids) stop(id)
  return ids
}
