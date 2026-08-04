import type { DroneId } from '@techtechflight/contract'
import type { AirspaceBreach } from './airspace.ts'

/**
 * Zone breaches as events, not as a condition that repeats every tick.
 *
 * `breachesAt` answers "where is this Drone out of place right now" — and on a boundary,
 * or hovering in a no-fly zone, that answer is the same forty times a second. A Teacher
 * and a score both need the *moment* the line was crossed: one breach, then silence until
 * the Drone is back in bounds and crosses again.
 *
 * Pure state, no React. The Integrator feeds `breachesAt` output here and handles whatever
 * arrives — a Logbook row, a Mission exception, a strip flash — once per rising edge.
 */

export interface BreachEvent extends AirspaceBreach {
  readonly droneId: DroneId
  /** Epoch ms when this breach began — the tick that first saw it. */
  readonly at: number
}

export interface FleetBreachInput {
  readonly droneId: DroneId
  readonly breaches: readonly AirspaceBreach[]
}

/** Stable identity for "this Drone, this kind of breach, this zone". */
export function breachKey(droneId: DroneId, breach: AirspaceBreach): string {
  return `${droneId}:${breach.kind}:${breach.zoneId}`
}

/**
 * Which breaches are live right now, so only new ones come back from `observe`.
 *
 * A breach that clears is forgotten. If the same Drone enters the same zone again later
 * that is new news — not something that has been outstanding since the first crossing.
 */
export class BreachTracker {
  readonly #active = new Set<string>()

  /**
   * One Drone's current breaches. Returns only those that just began; an empty array when
   * nothing new happened, even if the Drone is still out of place.
   */
  observe(
    droneId: DroneId,
    breaches: readonly AirspaceBreach[],
    at: number,
  ): readonly BreachEvent[] {
    const live = new Set<string>()
    const events: BreachEvent[] = []

    for (const breach of breaches) {
      const key = breachKey(droneId, breach)
      live.add(key)
      if (!this.#active.has(key)) {
        this.#active.add(key)
        events.push({ ...breach, droneId, at })
      }
    }

    for (const key of [...this.#active.keys()]) {
      if (key.startsWith(`${droneId}:`) && !live.has(key)) this.#active.delete(key)
    }

    return events
  }

  /** Every Drone in one vitals tick — board order preserved in the returned events. */
  observeFleet(
    craft: readonly FleetBreachInput[],
    at: number,
  ): readonly BreachEvent[] {
    const events: BreachEvent[] = []
    for (const entry of craft) {
      events.push(...this.observe(entry.droneId, entry.breaches, at))
    }
    return events
  }

  reset(): void {
    this.#active.clear()
  }
}
