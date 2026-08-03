/**
 * Physical headcount before class — which craft are in the room, which are not.
 *
 * Telemetry Offline is a different fact (no recent contact). This is the Teacher's
 * tick-list of airframes they can see on the bench. Order stays the Fleet's board
 * order; ticking never reorders the list (DELIBERATE-POSITIONS 1).
 */

export interface FleetCraft {
  readonly id: string
  readonly name: string
}

export interface HeadcountResult {
  readonly total: number
  /** Present even at zero — a counter that vanishes makes its return a layout event. */
  readonly presentCount: number
  /** Craft not yet ticked, still in board order. */
  readonly missing: readonly FleetCraft[]
}

export function fleetHeadcount(
  fleet: readonly FleetCraft[],
  presentIds: ReadonlySet<string>,
): HeadcountResult {
  const missing = fleet.filter((craft) => !presentIds.has(craft.id))
  return {
    total: fleet.length,
    presentCount: fleet.length - missing.length,
    missing,
  }
}

/** Toggle one craft in/out of the present set without mutating the input. */
export function togglePresent(
  presentIds: ReadonlySet<string>,
  droneId: string,
): ReadonlySet<string> {
  const next = new Set(presentIds)
  if (next.has(droneId)) next.delete(droneId)
  else next.add(droneId)
  return next
}

export function formatHeadcount(result: HeadcountResult): string {
  return `${result.presentCount} of ${result.total} present`
}
