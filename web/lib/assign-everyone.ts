import type { DroneId } from '@techtechflight/contract'
import { assignNextRosterName } from './logbook'

/**
 * Fill every free craft from the roster in board order — one tap for the whole class.
 *
 * Walks `droneIds` as given (board order). Craft that already have a Student are left
 * alone; each empty craft takes the next unassigned roster name. Returns how many were
 * assigned so the Teacher can see the result without recounting the column.
 */
export function assignEveryone(droneIds: readonly DroneId[]): number {
  let assigned = 0
  for (const droneId of droneIds) {
    if (assignNextRosterName(droneId) !== null) assigned += 1
  }
  return assigned
}
