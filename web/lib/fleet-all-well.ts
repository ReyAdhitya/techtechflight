import type { Status } from '@techtechflight/contract'
import { needsAttention } from '@techtechflight/contract'

/**
 * One sentence that answers "is everything fine" for the Fleet.
 *
 * Built from Needs Attention alone — the same bucket FleetSummary counts. The line is
 * always a sentence, including at zero: a count that appears only when trouble arrives
 * would be a layout event, and the eye reads those as noise (DELIBERATE-POSITIONS 3).
 */

export interface FleetAllWell {
  /** How many craft sit in Needs Attention right now. */
  readonly attentionCount: number
  /** The Teacher-facing sentence. Always present. */
  readonly sentence: string
}

/** Derive the calm (or not) one-liner from Statuses. */
export function fleetAllWell(
  drones: readonly { readonly status: Status }[],
): FleetAllWell {
  const attentionCount = drones.filter((drone) => needsAttention(drone.status)).length
  return {
    attentionCount,
    sentence: fleetAllWellSentence(attentionCount),
  }
}

/** The sentence alone, when a caller already has the count. */
export function fleetAllWellSentence(attentionCount: number): string {
  if (attentionCount === 0) return 'Everything is fine — 0 need attention'
  if (attentionCount === 1) return '1 needs attention'
  return `${attentionCount} need attention`
}
