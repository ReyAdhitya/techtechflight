import type { DroneId } from '@techtechflight/contract'

/**
 * Who has been airborne longest right now, and for how long.
 *
 * Duration is measured from when this board first saw the craft up in the current stint
 * (`AirborneTracker`), not from a Telemetry field — nothing on the wire carries "took off
 * at". Landing clears the clock so a second flight is new news.
 */

export interface AirborneCraftInput {
  readonly droneId: DroneId
  readonly callsign: string
  readonly airborne: boolean
  /** Epoch ms when this stint began, or null when unknown / not up. */
  readonly airborneSince: number | null
}

export interface LongestAirborne {
  readonly droneId: DroneId
  readonly callsign: string
  readonly durationMs: number
}

/**
 * The currently airborne craft with the earliest takeoff in this stint.
 *
 * Null when nobody is up, or when no airborne craft carries a known start. Ties keep the
 * first in the caller's order (board order), never Status-sorted.
 */
export function longestAirborne(
  craft: readonly AirborneCraftInput[],
  now: number,
): LongestAirborne | null {
  let best: LongestAirborne | null = null
  let bestSince = Number.POSITIVE_INFINITY

  for (const entry of craft) {
    if (!entry.airborne || entry.airborneSince === null) continue
    const durationMs = Math.max(0, now - entry.airborneSince)
    if (entry.airborneSince < bestSince) {
      bestSince = entry.airborneSince
      best = {
        droneId: entry.droneId,
        callsign: entry.callsign,
        durationMs,
      }
    }
  }

  return best
}

/** Teacher-facing sentence, or null when nobody is up with a known start. */
export function longestAirborneSentence(result: LongestAirborne | null): string | null {
  if (result === null) return null
  return `${result.callsign} has been up longest, ${formatAirborneDuration(result.durationMs)}`
}

/**
 * Compact duration for a strip glance: `m:ss`, or `h:mm` past an hour.
 *
 * Same shape as the Lesson elapsed clock so a Teacher scanning Control does not switch
 * formats mid-glance.
 */
export function formatAirborneDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1_000))
  const hours = Math.floor(totalSeconds / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}`
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/**
 * When each craft became airborne this stint.
 *
 * Observe on every vitals tick. A craft that lands forgets its start; the next takeoff
 * begins a new clock. Same shape as AlertTracker — a pure map the Integrator can feed
 * into `longestAirborne`.
 */
export class AirborneTracker {
  readonly #since = new Map<DroneId, number>()

  observe(
    craft: readonly { readonly droneId: DroneId; readonly airborne: boolean }[],
    at: number,
  ): void {
    const live = new Set<DroneId>()
    for (const entry of craft) {
      if (!entry.airborne) {
        this.#since.delete(entry.droneId)
        continue
      }
      live.add(entry.droneId)
      if (!this.#since.has(entry.droneId)) this.#since.set(entry.droneId, at)
    }
    for (const droneId of [...this.#since.keys()]) {
      if (!live.has(droneId)) this.#since.delete(droneId)
    }
  }

  sinceOf(droneId: DroneId): number | null {
    return this.#since.get(droneId) ?? null
  }

  get since(): ReadonlyMap<DroneId, number> {
    return this.#since
  }

  reset(): void {
    this.#since.clear()
  }
}
