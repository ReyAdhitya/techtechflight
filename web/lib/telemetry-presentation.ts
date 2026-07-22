import type {
  AutoLandingState,
  DroneState,
  FleetEvent,
  FleetEventKind,
  ProximityReading,
  Telemetry,
} from '@techtechflight/contract'

/**
 * How the readings the aircraft sends read on the board.
 *
 * Every one of these follows the same rule the rest of the product follows: a reading
 * the Drone cannot take is said plainly rather than shown as a zero, and an inference is
 * never allowed to dress up as a measurement.
 */

/** Height above the point it took off from. */
export function formatAltitude(metres: number): string {
  if (metres <= 0) return 'On the ground'
  return `${metres.toFixed(metres < 10 ? 1 : 0)} m`
}

export function formatDegrees(degrees: number): string {
  return `${degrees > 0 ? '+' : ''}${degrees.toFixed(1)}°`
}

/** A compass point, because "271°" is not a direction anyone turns their head to. */
export function formatHeading(yawDegrees: number): string {
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round((((yawDegrees % 360) + 360) % 360) / 45) % 8
  return `${Math.round(yawDegrees)}° ${points[index]}`
}

export function formatThrust(fraction: number): string {
  return `${Math.round(fraction * 100)}%`
}

/**
 * What the aircraft can do about landing itself.
 *
 * `unsupported` says something permanent about the airframe, `unavailable` says
 * something temporary about right now, and the words have to keep them apart — a Teacher
 * deciding which Drone to hand out needs to know which of the two they are reading.
 */
export const AUTO_LANDING_PRESENTATION: Readonly<
  Record<AutoLandingState, { label: string; meaning: string }>
> = {
  unsupported: {
    label: 'Not fitted',
    meaning: 'This airframe cannot land itself. It has to be flown down.',
  },
  unavailable: {
    label: 'Not available',
    meaning: 'Nothing to land — this Drone is already on the ground.',
  },
  ready: {
    label: 'Ready',
    meaning: 'This Drone can bring itself down if it is asked to.',
  },
  'in-progress': {
    label: 'Landing itself',
    meaning: 'Coming down now. Keep the space below it clear.',
  },
}

/**
 * What the rangefinder is seeing.
 *
 * Three answers, not two. `undefined` means there is no rangefinder aboard at all and
 * the board must say so rather than implying clear air; `null` means the sensor is
 * fitted and sees nothing close, which is genuinely good news.
 */
export function describeProximity(
  proximity: ProximityReading | null | undefined,
): { readonly text: string; readonly fitted: boolean; readonly close: boolean } {
  if (proximity === undefined) {
    return { text: 'No obstacle sensor fitted', fitted: false, close: false }
  }
  if (proximity === null) return { text: 'Nothing close', fitted: true, close: false }

  const where =
    proximity.bearingDegrees === null
      ? ''
      : ` ${bearingInWords(proximity.bearingDegrees)}`
  return {
    text: `${proximity.metres.toFixed(1)} m away${where}`,
    fitted: true,
    close: proximity.metres <= 1,
  }
}

/** Relative to the nose, in the words someone standing in the room would use. */
function bearingInWords(bearingDegrees: number): string {
  const bearing = ((bearingDegrees % 360) + 360) % 360
  if (bearing < 23 || bearing >= 338) return 'ahead'
  if (bearing < 68) return 'ahead and right'
  if (bearing < 113) return 'to its right'
  if (bearing < 158) return 'behind and right'
  if (bearing < 203) return 'behind'
  if (bearing < 248) return 'behind and left'
  if (bearing < 293) return 'to its left'
  return 'ahead and left'
}

/**
 * The one line a Teacher needs about a Drone that is not alright.
 *
 * A latched emergency stop is reported as a boolean rather than as a fault, so without
 * this the most serious thing that can happen to a Drone would reach the detail view as
 * an empty space where a reason goes.
 */
export function faultReason(telemetry: Telemetry | null): string | null {
  if (!telemetry) return null
  if (telemetry.emergencyStopTriggered) {
    return telemetry.fault?.description ?? 'The emergency stop has been pressed and is still held.'
  }
  return telemetry.fault?.description ?? null
}

/** True when this Drone is reporting something that should be seen from across the room. */
export function isUrgent(drone: DroneState): boolean {
  const telemetry = drone.telemetry
  if (!telemetry) return false
  if (telemetry.emergencyStopTriggered) return true
  return describeProximity(telemetry.proximity).close
}

/* --- What happened ------------------------------------------------------- */

/**
 * One event as a Teacher would say it.
 *
 * The Drone's name is kept separate from the verb so a timeline can set the name in the
 * board's own display face and still read as a sentence when a screen reader runs the
 * two together.
 */
export const EVENT_VERB: Readonly<Record<FleetEventKind, string>> = {
  'first-contact': 'came online',
  'contact-lost': 'dropped out of contact',
  'contact-restored': 'came back into contact',
  'took-off': 'took off',
  landed: 'landed',
  'fault-raised': 'developed a fault',
  'fault-cleared': 'cleared its fault',
  'charge-low': 'fell below a usable charge',
  'became-ready': 'became Ready',
}

export function describeEvent(event: FleetEvent): string {
  return `${event.droneName} ${EVENT_VERB[event.kind]}`
}

/** Clock time, for a timeline where "4m ago" stops being enough to place something. */
export function formatClock(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
