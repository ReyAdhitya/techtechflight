import type { DroneRegistration } from '@techtechflight/contract'

/**
 * The classroom set the ground station runs against by default.
 *
 * Identity is stable and board order is fixed, so "Drone 2 is broken" stays true
 * tomorrow and each Drone keeps its place on the board between sessions. Six Drones is
 * the top of the range the tile layout is designed for.
 */
export const CLASSROOM_FLEET: readonly DroneRegistration[] = [
  { id: 'ttf-0001', name: 'Drone 1', boardOrder: 1 },
  { id: 'ttf-0002', name: 'Drone 2', boardOrder: 2 },
  { id: 'ttf-0003', name: 'Drone 3', boardOrder: 3 },
  { id: 'ttf-0004', name: 'Drone 4', boardOrder: 4 },
  { id: 'ttf-0005', name: 'Drone 5', boardOrder: 5 },
  { id: 'ttf-0006', name: 'Drone 6', boardOrder: 6 },
]
