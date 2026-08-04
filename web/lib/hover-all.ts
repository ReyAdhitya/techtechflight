/**
 * Hover every airborne craft — the pure half of "Hover all".
 *
 * Issues the `hold` Command per craft (Teacher-facing word: Hover). Same airborne
 * filter as Land all; the Integrator passes `command(id, 'hold')` as `hover`.
 */

import { airborneIdsToLand, type LandAllTarget } from './land-all.ts'

export type HoverAllTarget = LandAllTarget

/** Craft that should receive a hold Command — airborne only. */
export function airborneIdsToHover(fleet: readonly HoverAllTarget[]): readonly string[] {
  return airborneIdsToLand(fleet)
}

/**
 * Issue hold to every airborne craft. Returns the ids asked, in board order.
 * Does nothing when none are up — the button should already be hidden.
 */
export function issueHoverAll(
  fleet: readonly HoverAllTarget[],
  hover: (droneId: string) => void,
): readonly string[] {
  const ids = airborneIdsToHover(fleet)
  for (const id of ids) hover(id)
  return ids
}
