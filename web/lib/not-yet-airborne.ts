import type { DroneId } from '@techtechflight/contract'

/**
 * Who has not taken off yet — grounded craft with an assigned Student, after the Lesson
 * starts.
 *
 * Before a Lesson starts this is silence: naming grounded craft then would read as a
 * problem when it is simply the resting state of the room. Order follows the caller's
 * board order and never re-sorts by Status (DELIBERATE-POSITIONS 1).
 */

export interface NotYetAirborneCraft {
  readonly droneId: DroneId
  readonly callsign: string
  readonly studentName: string
}

export interface NotYetAirborneInput {
  readonly droneId: DroneId
  readonly callsign: string
  /** True when Telemetry says the craft is off the ground. */
  readonly airborne: boolean
  /** Assigned Student name for this craft, or null when nobody is paired. */
  readonly studentName: string | null
}

/**
 * Grounded, assigned craft after the Lesson has started.
 *
 * Empty (not null) when everyone assigned is already up — a calm empty list the component
 * can choose to hide, rather than inventing a sentence.
 */
export function notYetAirborne(
  craft: readonly NotYetAirborneInput[],
  lessonStarted: boolean,
): readonly NotYetAirborneCraft[] {
  if (!lessonStarted) return []

  const waiting: NotYetAirborneCraft[] = []
  for (const entry of craft) {
    if (entry.airborne) continue
    if (entry.studentName === null || entry.studentName.trim() === '') continue
    waiting.push({
      droneId: entry.droneId,
      callsign: entry.callsign,
      studentName: entry.studentName,
    })
  }
  return waiting
}

/** One Teacher-facing sentence naming the waiting craft, or null when none. */
export function notYetAirborneSentence(
  waiting: readonly NotYetAirborneCraft[],
): string | null {
  if (waiting.length === 0) return null
  if (waiting.length === 1) {
    const only = waiting[0]!
    return `${only.callsign} (${only.studentName}) has not taken off yet`
  }
  const names = waiting.map((entry) => `${entry.callsign} (${entry.studentName})`).join(', ')
  return `Not yet airborne: ${names}`
}
