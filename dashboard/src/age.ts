import type { DroneState, FleetState } from '@techtechflight/contract'

/**
 * How old a Drone's Telemetry is, right now.
 *
 * Measured as the age the ground station reported, plus however long the snapshot has
 * been sitting on this screen. Going via the ground station's own `generatedAt` rather
 * than comparing its Last Contact to the browser clock means a laptop whose clock is
 * wrong cannot invent or hide staleness.
 *
 * Null when the Drone has never been heard from — there is no age for silence that has
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

/** The exact moment, for a Teacher who wants to judge for themselves. */
export function formatExactTime(epochMs: number): string {
  const at = new Date(epochMs)
  const time = at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const isToday = new Date().toDateString() === at.toDateString()
  return isToday ? time : `${at.toLocaleDateString()} ${time}`
}
