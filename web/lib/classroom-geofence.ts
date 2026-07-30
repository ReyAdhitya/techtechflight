/**
 * Classroom geofence extents in metres from the Fleet setup point.
 *
 * A teaching default — not measured from the room. Scope draws this boundary on the
 * top-down view so a Teacher can see whether craft stay inside the nominal classroom
 * box. Nothing alerts from it yet; the line is orientation only (ADR-0014).
 */
export const CLASSROOM_GEOFENCE = {
  /** West edge, metres east of setup (negative = west). */
  westM: -4,
  /** East edge. */
  eastM: 4,
  /** South edge, metres north of setup (negative = south). */
  southM: -3,
  /** North edge. */
  northM: 3,
} as const

/** Width and height of the box, for captions and tests. */
export const CLASSROOM_GEOFENCE_SIZE_M = {
  widthM: CLASSROOM_GEOFENCE.eastM - CLASSROOM_GEOFENCE.westM,
  heightM: CLASSROOM_GEOFENCE.northM - CLASSROOM_GEOFENCE.southM,
} as const
