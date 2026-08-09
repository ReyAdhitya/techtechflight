import type { LocalPosition } from '@techtechflight/contract'

/**
 * The flight area, as polygons in the Fleet's own frame.
 *
 * Every point here is metres east and north of where the Fleet was set up — the same
 * frame `LocalPosition` uses, and that is the whole safety argument (ADR-0019). A zone and
 * a Drone share their origin, so "is this Drone inside that polygon" is a *relative* claim
 * and survives an origin that is wrong, exactly the way separation alerts already do.
 *
 * There is no latitude here and there must never be one. A zone anchored to the planet
 * would be wrong by however far the origin is wrong, which is the absolute claim ADR-0012
 * was right to refuse.
 *
 * Pure geometry, no React, no storage. The one part of the mission layer a jsdom suite can
 * verify completely, so it is tested completely.
 */

/**
 * Only no-go areas are drawn (ADR-0027).
 *
 * There was a `'mission'` kind, a polygon around the area the class was meant to stay
 * inside. The class flies in a physical net cage, so it drew a boundary a Teacher could
 * already see, and a slightly small one reported a breach for a Drone that was safely inside
 * the netting. A no-fly area is the one that is genuinely invisible.
 */
export type ZoneKind =
  /** Where a Drone must not go. Any number of them, and they may overlap each other. */
  'no-fly'

export interface Zone {
  readonly id: string
  readonly kind: ZoneKind
  /** What a Teacher calls it out loud — "the netting", "over the desks". */
  readonly name: string
  /**
   * The boundary, in order. Three points is the fewest that encloses anything; fewer is
   * kept rather than rejected, because a half-drawn zone is a normal state of the editor
   * and `enclosesAnything` is what decides whether it counts yet.
   */
  readonly points: readonly LocalPosition[]
}

/** The fewest points that can enclose an area. */
const MIN_POINTS = 3

/** A zone still being drawn encloses nothing, and nothing is inside nothing. */
export function enclosesAnything(zone: Zone): boolean {
  return zone.points.length >= MIN_POINTS
}

/**
 * Whether a point is inside a polygon, by ray casting.
 *
 * Counts how many edges a ray heading east from the point crosses; odd means inside. It
 * handles concave shapes, which matters because a Teacher drawing around the desks will
 * produce one on the first try.
 *
 * The half-open edge test (`>` on one end, `<=` on the other) is what stops a ray that
 * passes exactly through a vertex being counted twice. Without it a Drone at the same
 * northing as a corner reads as outside a zone it is in the middle of — a rare input, and
 * the kind that reaches a classroom rather than a test.
 */
export function containsPoint(zone: Zone, point: LocalPosition): boolean {
  if (!enclosesAnything(zone)) return false

  let inside = false
  const points = zone.points

  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const a = points[i]
    const b = points[j]
    if (!a || !b) continue

    const straddles = a.northM > point.northM !== b.northM > point.northM
    if (!straddles) continue

    // Where the edge crosses the ray's northing.
    const crossingEast =
      a.eastM + ((point.northM - a.northM) / (b.northM - a.northM)) * (b.eastM - a.eastM)

    if (point.eastM < crossingEast) inside = !inside
  }

  return inside
}

/**
 * How far a point is from the nearest edge, in metres. Always positive — inside or out.
 *
 * Distance to the *boundary*, deliberately, rather than a signed depth. A Teacher watching
 * a Drone approach the netting wants to know how much room is left, and that number is the
 * same question whichever side of the line the Drone is on.
 */
export function distanceToEdge(zone: Zone, point: LocalPosition): number | null {
  if (zone.points.length < 2) return null

  let nearest = Number.POSITIVE_INFINITY
  const points = zone.points

  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const a = points[i]
    const b = points[j]
    if (!a || !b) continue
    nearest = Math.min(nearest, distanceToSegment(point, a, b))
  }

  return Number.isFinite(nearest) ? round(nearest) : null
}

/** Shortest distance from a point to a line segment, clamped to the segment's ends. */
function distanceToSegment(p: LocalPosition, a: LocalPosition, b: LocalPosition): number {
  const runEast = b.eastM - a.eastM
  const runNorth = b.northM - a.northM
  const lengthSquared = runEast * runEast + runNorth * runNorth

  // A degenerate edge — two identical points — is just the point.
  if (lengthSquared === 0) return Math.hypot(p.eastM - a.eastM, p.northM - a.northM)

  const along =
    ((p.eastM - a.eastM) * runEast + (p.northM - a.northM) * runNorth) / lengthSquared
  const clamped = Math.max(0, Math.min(1, along))

  return Math.hypot(
    p.eastM - (a.eastM + clamped * runEast),
    p.northM - (a.northM + clamped * runNorth),
  )
}

/**
 * The area a zone encloses, in square metres, by the shoelace formula.
 *
 * Used to tell a Teacher what they have drawn, and to catch a zone drawn by accident —
 * two taps and a stray one enclose almost nothing and are worth querying rather than
 * silently enforcing.
 */
export function areaM2(zone: Zone): number {
  if (!enclosesAnything(zone)) return 0

  let doubled = 0
  const points = zone.points

  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const a = points[i]
    const b = points[j]
    if (!a || !b) continue
    doubled += b.eastM * a.northM - a.eastM * b.northM
  }

  return round(Math.abs(doubled) / 2)
}

/**
 * Whether a Drone is somewhere it should not be.
 *
 * One failure now rather than two. There used to be a `'left-mission-zone'` alongside this,
 * and it went with the go-area (ADR-0027): the netting is what says a Drone has gone too far,
 * and a drawn boundary that disagreed with the netting taught a class to ignore the board.
 */
export interface AirspaceBreach {
  readonly kind: 'entered-no-fly'
  readonly zoneId: string
  readonly zoneName: string
}

/**
 * Every way this position is out of place.
 *
 * A Mission with no zones drawn raises nothing, which is a Teacher's first lesson and has to
 * read as no opinion rather than as an alarm.
 */
export function breachesAt(
  zones: readonly Zone[],
  position: LocalPosition,
): readonly AirspaceBreach[] {
  const breaches: AirspaceBreach[] = []

  for (const zone of zones) {
    if (!enclosesAnything(zone)) continue
    if (containsPoint(zone, position)) {
      breaches.push({ kind: 'entered-no-fly', zoneId: zone.id, zoneName: zone.name })
    }
  }

  return breaches
}

/**
 * How close this position is to trouble, in metres, or null when nothing can be said.
 *
 * Null rather than Infinity, because "no zones drawn" is a state a Teacher sees for the
 * whole of the first lesson and it has to read as *not measured* rather than as *miles of
 * room*.
 */
export function metresToNearestLimit(
  zones: readonly Zone[],
  position: LocalPosition,
): number | null {
  const usable = zones.filter(enclosesAnything)
  if (usable.length === 0) return null

  let nearest: number | null = null
  for (const zone of usable) {
    const distance = distanceToEdge(zone, position)
    if (distance === null) continue
    nearest = nearest === null ? distance : Math.min(nearest, distance)
  }

  return nearest
}

const round = (value: number) => Number(value.toFixed(2))
