import type { DroneState, FleetState } from '@techtechflight/contract'

/**
 * How old a Drone's Telemetry is, right now.
 *
 * Measured as the age the ground station reported, plus however long the snapshot has
 * been sitting on this screen. Going via the ground station's own `generatedAt` rather
 * than comparing its Last Contact to the browser clock means a laptop whose clock is
 * wrong cannot invent or hide staleness.
 *
 * Null when the Drone has never responded — there is no age for silence that has
 * always been.
 */
export function ageMs(
  drone: DroneState,
  state: FleetState,
  receivedAt: number,
  now: number,
): number | null {
  if (drone.lastContact === null) return null
  return state.generatedAt - drone.lastContact + Math.max(0, now - receivedAt)
}

const SECOND = 1_000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Age in words. Every displayed value is qualified by one of these, so that nothing on
 * the board can be read as current when it is not.
 */
export function formatAge(milliseconds: number): string {
  if (milliseconds < 5 * SECOND) return 'just now'
  if (milliseconds < MINUTE) return `${Math.floor(milliseconds / SECOND)}s ago`
  if (milliseconds < HOUR) return `${Math.floor(milliseconds / MINUTE)}m ago`
  if (milliseconds < DAY) return `${Math.floor(milliseconds / HOUR)}h ago`
  const days = Math.floor(milliseconds / DAY)
  return days === 1 ? 'yesterday' : `${days}d ago`
}

/**
 * How much time a window covers, in words.
 *
 * A span rather than an age, and not derivable from one. `formatAge` ends in "ago"
 * because it says how long ago something was; a window says how much of the past a
 * record reaches back over, and reads inside a sentence — "Covering the last ___".
 *
 * The timeline used to build this by deleting "ago" from an age, which held right up
 * until the answer was "just now" or "yesterday" — neither of which contains the word —
 * and printed "Covering the last just now" on a freshly started ground station.
 */
export function formatDuration(milliseconds: number): string {
  // Too short to name a number for. A window of three seconds is not four seconds of
  // history, it is a record that has only just started.
  if (milliseconds < 5 * SECOND) return 'few seconds'
  if (milliseconds < MINUTE) return `${Math.floor(milliseconds / SECOND)} seconds`

  // One of something drops its number: "the last minute" rather than "the last 1 minute".
  if (milliseconds < HOUR) {
    const minutes = Math.floor(milliseconds / MINUTE)
    return minutes === 1 ? 'minute' : `${minutes} minutes`
  }
  if (milliseconds < DAY) {
    const hours = Math.floor(milliseconds / HOUR)
    return hours === 1 ? 'hour' : `${hours} hours`
  }
  const days = Math.floor(milliseconds / DAY)
  return days === 1 ? 'day' : `${days} days`
}

/** The exact moment, for a Teacher who wants to judge for themselves. */
export function formatExactTime(epochMs: number): string {
  const at = new Date(epochMs)
  const time = at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const isToday = new Date().toDateString() === at.toDateString()
  return isToday ? time : `${at.toLocaleDateString()} ${time}`
}
