import type { Mission } from './mission.ts'

/**
 * Time left on a Mission's Scenario limit.
 *
 * A limit is optional — many classes run until the Teacher says stop. When there is no
 * limit, the honest reading is null and the words say so; inventing zero would read as
 * "time is up" and panic a room that was never on a clock.
 *
 * Pure state, no React. The Integrator reads `missionClock` for the strip and feeds
 * `MissionTimeoutTracker` so `mission-timeout` fires once at the crossing, not every tick.
 */

export interface MissionClockReading {
  /** Milliseconds until the limit, or null when there is no limit or the Mission has not started. */
  readonly remainingMs: number | null
  /** What a Teacher reads at a glance. */
  readonly words: string
  /** True once the Scenario limit has been reached or passed. */
  readonly timedOut: boolean
}

/** Stable identity for "this Mission run" — a restart with a new start time is new news. */
export function missionRunKey(mission: Mission): string {
  return `${mission.id}:${mission.startedAt ?? 'none'}`
}

/**
 * The clock reading for one Mission at one moment.
 *
 * Not started comes before no-limit: a Scenario picked but not yet cleared should not
 * pretend a countdown has begun.
 */
export function missionClock(mission: Mission, now: number): MissionClockReading {
  if (mission.startedAt === null) {
    return { remainingMs: null, words: 'Not started', timedOut: false }
  }

  if (mission.limitMinutes === null) {
    return { remainingMs: null, words: 'No time limit', timedOut: false }
  }

  const limitMs = mission.limitMinutes * 60_000
  const elapsedMs = Math.max(0, now - mission.startedAt)
  const remainingMs = Math.max(0, limitMs - elapsedMs)

  if (remainingMs === 0) {
    return { remainingMs: 0, words: 'Time is up', timedOut: true }
  }

  return {
    remainingMs,
    words: formatMissionRemaining(remainingMs),
    timedOut: false,
  }
}

/** Countdown in whole minutes — rounded up so the strip never understates time left. */
export function formatMissionRemaining(remainingMs: number): string {
  if (remainingMs < 60_000) return 'Under a minute left'
  const minutes = Math.ceil(remainingMs / 60_000)
  if (minutes === 1) return '1 min left'
  return `${minutes} min left`
}

/**
 * Whether to raise `mission-timeout` on this tick.
 *
 * The limit expiring is an event, not a condition that repeats every frame. Same rising-
 * edge shape as `BreachTracker`: one alert at the crossing, then silence until the Mission
 * run ends or the clock is no longer expired.
 */
export class MissionTimeoutTracker {
  readonly #raised = new Set<string>()

  observe(mission: Mission, now: number): boolean {
    const reading = missionClock(mission, now)
    const key = missionRunKey(mission)

    if (!reading.timedOut) {
      this.#raised.delete(key)
      return false
    }

    if (this.#raised.has(key)) return false
    this.#raised.add(key)
    return true
  }

  reset(): void {
    this.#raised.clear()
  }
}
