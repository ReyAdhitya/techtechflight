import type { DroneId, LocalPosition } from '@techtechflight/contract'

/**
 * Where each Drone left the ground, so Recall has somewhere to mean.
 *
 * **Automatic, and one per Drone.** Nothing asks a Teacher for it, nothing is drawn and no
 * marker is placed: home is wherever the Drone was standing on the last Telemetry frame
 * before it was first seen off the ground. That is the only definition that needs no work
 * from anybody and cannot disagree with where the aircraft actually was.
 *
 * One per Drone matters more than it looks. Recall sends a craft home, and six craft
 * Recalled to one square metre collide.
 *
 * Read from Telemetry the way `AirborneTracker` reads a takeoff clock: nothing on the wire
 * carries "home", so this board watches the rising edge and remembers it. A Drone the board
 * has only ever seen airborne has no home, and that is said as absent rather than guessed at
 * from where it happens to be now.
 */

export interface HomePointInput {
  readonly droneId: DroneId
  readonly airborne: boolean
  /** Where the Fleet says it is, or null when it is not reporting a position. */
  readonly position: LocalPosition | null
}

export class HomePointTracker {
  /** The last position seen while a Drone was on the ground. */
  readonly #parked = new Map<DroneId, LocalPosition>()
  /** Where it was standing when this stint began. */
  readonly #home = new Map<DroneId, LocalPosition>()
  readonly #wasAirborne = new Map<DroneId, boolean>()

  /**
   * Watch a tick.
   *
   * Grounded frames keep the parked spot fresh. The frame where a Drone first reads airborne
   * is the one that commits it: the position on *that* frame is already a metre or two up
   * and along, so the last grounded one is the honest answer, and only that.
   */
  observe(craft: readonly HomePointInput[]): void {
    for (const entry of craft) {
      const before = this.#wasAirborne.get(entry.droneId) === true

      if (!entry.airborne) {
        if (entry.position !== null) this.#parked.set(entry.droneId, entry.position)
      } else if (!before) {
        const parked = this.#parked.get(entry.droneId) ?? entry.position
        if (parked !== null) this.#home.set(entry.droneId, parked)
      }

      this.#wasAirborne.set(entry.droneId, entry.airborne)
    }
  }

  /** Where Recall would send this Drone, or null when the board never saw it leave. */
  homeOf(droneId: DroneId): LocalPosition | null {
    return this.#home.get(droneId) ?? null
  }

  /** Every home this board has recorded, for a Scope that wants to draw them. */
  all(): ReadonlyMap<DroneId, LocalPosition> {
    return this.#home
  }

  reset(): void {
    this.#parked.clear()
    this.#home.clear()
    this.#wasAirborne.clear()
  }
}

/**
 * Where Recall sends it, in words, or the absence said plainly.
 *
 * Metres east and north of the Fleet's own origin, never a latitude (ADR-0019).
 */
export function homePointWords(home: LocalPosition | null): string {
  if (home === null) return 'Not seen taking off'
  return `${home.eastM.toFixed(1)} m east, ${home.northM.toFixed(1)} m north`
}
