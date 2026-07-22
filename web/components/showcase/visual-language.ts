import type { DroneState, Status } from '@techtechflight/contract'
import { needsAttention } from '@techtechflight/contract'

/**
 * The showcase's own visual vocabulary.
 *
 * Kept in one file so the CSS tokens in `showcase.css`, the 3D materials and the filter
 * ordering cannot disagree about what a Status looks like. The words themselves come
 * from `CONTEXT.md` and are never restated here — `STATUS_PRESENTATION` in
 * `lib/status-presentation.ts` remains the only place a Status is given a label.
 */

/** Hex for the 3D stage, which cannot read CSS custom properties. */
export interface StatusTone {
  readonly light: number
  readonly dark: number
}

export const STATUS_TONE: Readonly<Record<Status, StatusTone>> = {
  Ready: { light: 0x14a273, dark: 0x2fca90 },
  Flying: { light: 0x3b8ede, dark: 0x4aa8ec },
  'Not Ready': { light: 0xe0a020, dark: 0xf5a524 },
  Fault: { light: 0xe4553a, dark: 0xf75a36 },
  Offline: { light: 0xa49c90, dark: 0x7d7568 },
}

export const AIRFRAME_TONE: StatusTone = { light: 0xd6d0c5, dark: 0x40382d }
export const PAD_TONE: StatusTone = { light: 0xe7e3db, dark: 0x1a150f }

export function tone(pair: StatusTone, dark: boolean): number {
  return dark ? pair.dark : pair.light
}

/**
 * Which Drone the 3D stage should be showing when a Teacher has not picked one.
 *
 * The stage is a single object, so it has to earn its place by showing the Drone that
 * most needs a decision rather than whichever happens to be first. Fault outranks Not
 * Ready because it is the one a Teacher cannot fix; Flying outranks Ready because it is
 * the one that is changing.
 */
const FOCUS_ORDER: readonly Status[] = ['Fault', 'Not Ready', 'Flying', 'Ready', 'Offline']

export function focusDrone(drones: readonly DroneState[]): DroneState | null {
  for (const status of FOCUS_ORDER) {
    const match = drones.find((drone) => drone.status === status)
    if (match) return match
  }
  return drones[0] ?? null
}

/** The buckets the filter offers. `all` keeps the ground station's board order. */
export type FleetFilter = 'all' | 'usable' | 'attention' | 'offline'

export const FILTERS: readonly { readonly id: FleetFilter; readonly label: string }[] = [
  { id: 'all', label: 'Whole Fleet' },
  { id: 'usable', label: 'Ready to hand out' },
  { id: 'attention', label: 'Needs Attention' },
  { id: 'offline', label: 'Offline' },
]

export function matchesFilter(drone: DroneState, filter: FleetFilter): boolean {
  switch (filter) {
    case 'usable':
      return drone.status === 'Ready'
    case 'attention':
      return needsAttention(drone.status)
    case 'offline':
      return drone.status === 'Offline'
    default:
      return true
  }
}

/**
 * How many Drones each filter would show, so the control can carry its own counts and a
 * Teacher never presses a bucket to find out it is empty.
 */
export function filterCounts(
  drones: readonly DroneState[],
): Readonly<Record<FleetFilter, number>> {
  return {
    all: drones.length,
    usable: drones.filter((drone) => matchesFilter(drone, 'usable')).length,
    attention: drones.filter((drone) => matchesFilter(drone, 'attention')).length,
    offline: drones.filter((drone) => matchesFilter(drone, 'offline')).length,
  }
}
