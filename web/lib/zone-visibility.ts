import type { Zone } from './airspace.ts'

/**
 * Whether a zone a Teacher drew is anywhere the Scope will actually draw it.
 *
 * The Scope draws a **window**: a square of space chosen from where the Drones are, from the
 * ladder in ADR-0014, and never the room. A Teacher drawing a zone is typing metres east and
 * north, and nothing stops them typing forty when the window is eight across. The zone is
 * real, `breachesAt` will fire on it, and it is invisible on every view.
 *
 * That is a worse failure than an ugly picture. A Teacher who cannot see a boundary stops
 * believing there is one, and the one thing this feature exists to do is let them watch it.
 * So it is said in words on the screen where the zone was drawn, rather than left for them to
 * notice.
 *
 * Pure geometry against the window's own bounds. It knows nothing about how the window was
 * chosen, which keeps `airspace.ts` ignorant of the display exactly as ADR-0019 requires.
 */

export interface ZoneWindow {
  readonly westM: number
  readonly eastM: number
  readonly southM: number
  readonly northM: number
}

export type ZoneVisibility =
  /** Every corner inside the window. Drawn whole, on all three views. */
  | 'inside'
  /** Some corners in and some out. Drawn, and cut off at the frame. */
  | 'partly'
  /** No corner inside. Nothing on any view, and this is the case worth saying. */
  | 'outside'

export function zoneVisibility(zone: Zone, window: ZoneWindow): ZoneVisibility {
  if (zone.points.length === 0) return 'outside'

  const inside = zone.points.filter(
    (point) =>
      point.eastM >= window.westM &&
      point.eastM <= window.eastM &&
      point.northM >= window.southM &&
      point.northM <= window.northM,
  ).length

  if (inside === zone.points.length) return 'inside'
  if (inside > 0) return 'partly'

  /*
   * No corner inside, and it can still cross the window: a zone drawn around the whole hall
   * has all four corners outside a window in the middle of it. That is drawn and is not the
   * problem, so the overlap is tested rather than the corners alone.
   */
  const eastLow = Math.min(...zone.points.map((point) => point.eastM))
  const eastHigh = Math.max(...zone.points.map((point) => point.eastM))
  const northLow = Math.min(...zone.points.map((point) => point.northM))
  const northHigh = Math.max(...zone.points.map((point) => point.northM))

  const overlaps =
    eastHigh > window.westM &&
    eastLow < window.eastM &&
    northHigh > window.southM &&
    northLow < window.northM

  return overlaps ? 'partly' : 'outside'
}

/** The zones a Teacher will not see, in the order they drew them. */
export function zonesOutsideWindow(
  zones: readonly Zone[],
  window: ZoneWindow,
): readonly Zone[] {
  return zones.filter((zone) => zoneVisibility(zone, window) === 'outside')
}
