import type { DroneState } from '@techtechflight/contract'

/** One east/north sample retained for ghost-path drawing. */
export interface GhostPathPoint {
  readonly eastM: number
  readonly northM: number
  readonly at: number
}

export type GhostPathStore = ReadonlyMap<string, readonly GhostPathPoint[]>

/** How long and how many points to keep per Drone — client-side only. */
export const GHOST_PATH_WINDOW_MS = 120_000
export const GHOST_PATH_MAX_POINTS = 40

/**
 * Record positions from the current Fleet State into a ring buffer.
 *
 * FleetHistory on the wire carries events and charge samples, not position trails, so this
 * accumulates on the board while Telemetry updates (see DECISIONS).
 */
export function recordGhostPaths(
  store: GhostPathStore,
  drones: readonly DroneState[],
  at: number,
): GhostPathStore {
  const next = new Map(store)
  for (const drone of drones) {
    const position = drone.telemetry?.position
    if (!position || drone.status === 'Offline') continue
    const previous = next.get(drone.id) ?? []
    const last = previous.at(-1)
    const sample: GhostPathPoint = {
      eastM: position.eastM,
      northM: position.northM,
      at,
    }
    if (
      last &&
      last.eastM === sample.eastM &&
      last.northM === sample.northM &&
      at - last.at < 500
    ) {
      continue
    }
    const kept = [...previous, sample].filter((point) => at - point.at <= GHOST_PATH_WINDOW_MS)
    next.set(drone.id, kept.slice(-GHOST_PATH_MAX_POINTS))
  }
  return next
}

export function ghostPathPoints(store: GhostPathStore, droneId: string): readonly GhostPathPoint[] {
  return store.get(droneId) ?? []
}

export function ghostPathsAvailable(store: GhostPathStore): boolean {
  for (const points of store.values()) {
    if (points.length >= 2) return true
  }
  return false
}
