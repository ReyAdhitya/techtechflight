import type { DroneRegistration } from '@techtechflight/contract'

export const MIN_CLASSROOM_FLEET_SIZE = 1
export const DEFAULT_CLASSROOM_FLEET_SIZE = 6

/**
 * Build a classroom Fleet of the given size.
 *
 * Identity is stable and board order is fixed, so "Drone 2 is broken" stays true
 * tomorrow and each Drone keeps its place on the board between sessions.
 *
 * **The twenty Drone cap is gone.** It was a constant in this file with nothing behind it: no
 * screen breaks at twenty-one, and the owner's instruction is unlimited. Still an integer and
 * still at least one, because half a Drone and no Drones are not classrooms.
 */
export function classroomFleet(size: number): readonly DroneRegistration[] {
  if (!Number.isInteger(size) || size < MIN_CLASSROOM_FLEET_SIZE) {
    throw new Error(
      `Classroom Fleet size must be a whole number of at least ${MIN_CLASSROOM_FLEET_SIZE}, got ${size}`,
    )
  }

  return Array.from({ length: size }, (_, index) => {
    const order = index + 1
    return {
      /*
       * Four digits, padded, and it stops padding rather than truncating past 9999. An id
       * that wrapped would give two aircraft one identity, which is worse than a long one.
       */
      id: `ttf-${String(order).padStart(4, '0')}`,
      name: `Drone ${order}`,
      boardOrder: order,
    }
  })
}

/**
 * The classroom set the ground station runs against by default.
 *
 * Six is the default because six is a comfortable class set, not because more is refused.
 */
export const CLASSROOM_FLEET: readonly DroneRegistration[] = classroomFleet(
  DEFAULT_CLASSROOM_FLEET_SIZE,
)
