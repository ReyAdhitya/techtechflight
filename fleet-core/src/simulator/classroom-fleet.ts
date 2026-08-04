import type { DroneRegistration } from '@techtechflight/contract'

const MIN_CLASSROOM_FLEET_SIZE = 1
const MAX_CLASSROOM_FLEET_SIZE = 20
const DEFAULT_CLASSROOM_FLEET_SIZE = 6

/**
 * Build a classroom Fleet of the given size.
 *
 * Identity is stable and board order is fixed, so "Drone 2 is broken" stays true
 * tomorrow and each Drone keeps its place on the board between sessions.
 */
export function classroomFleet(size: number): readonly DroneRegistration[] {
  if (
    !Number.isInteger(size) ||
    size < MIN_CLASSROOM_FLEET_SIZE ||
    size > MAX_CLASSROOM_FLEET_SIZE
  ) {
    throw new Error(
      `Classroom Fleet size must be an integer from ${MIN_CLASSROOM_FLEET_SIZE} to ${MAX_CLASSROOM_FLEET_SIZE}, got ${size}`,
    )
  }

  return Array.from({ length: size }, (_, index) => {
    const order = index + 1
    return {
      id: `ttf-${String(order).padStart(4, '0')}`,
      name: `Drone ${order}`,
      boardOrder: order,
    }
  })
}

/**
 * The classroom set the ground station runs against by default.
 *
 * Six Drones is the default; classrooms may configure up to twenty via
 * {@link classroomFleet}.
 */
export const CLASSROOM_FLEET: readonly DroneRegistration[] = classroomFleet(
  DEFAULT_CLASSROOM_FLEET_SIZE,
)
