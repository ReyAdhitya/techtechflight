import type { LocalPosition } from '@techtechflight/contract'

import { containsPoint, enclosesAnything, type Zone } from './airspace.ts'
import type { GhostPathPoint } from './scope-ghost-paths.ts'

/**
 * How much of the Mission Zone a craft has already searched, from its ghost-path trail.
 *
 * Teachers ask "have they covered the area yet?" — not "where is the Drone right now". The
 * answer is a fraction of the drawn polygon, estimated by laying a metre grid over the zone
 * and counting how many cells the trail has touched. Pure geometry, no React, no storage;
 * jsdom can verify it the same way it verifies `airspace.ts`.
 *
 * When the trail is too short, or the zone is not closed yet, the honest answer is *unknown*
 * — "Not enough track yet" — rather than zero, which would read as "they have searched
 * nothing" when the board simply has not watched long enough.
 */

/** Grid cell edge length, in metres. One metre matches desk-scale Mission Zones. */
export const ROUTE_COVERAGE_CELL_SIZE_M = 1

/** A segment is the fewest samples that mean movement rather than a parked craft. */
const MIN_PATH_POINTS = 2

const NOT_ENOUGH_WORDS = 'Not enough track yet'

export interface RouteCoverage {
  /** Share of the Mission Zone grid already visited, or null when it cannot be said yet. */
  readonly fraction: number | null
  /** What a Teacher reads on the Mission surface — a percentage or the unknown phrase. */
  readonly words: string
}

/**
 * Fraction of the Mission Zone the trail has flown over, and words for the Teacher.
 *
 * The grid sits in the Fleet's east/north frame, the same one the zone and ghost path use.
 * Path points mark cells; segments between them are sampled so a fast craft cannot skip a
 * strip between ticks.
 */
export function routeCoverage(
  zone: Zone,
  path: readonly GhostPathPoint[],
): RouteCoverage {
  if (!enclosesAnything(zone)) {
    return { fraction: null, words: NOT_ENOUGH_WORDS }
  }

  if (path.length < MIN_PATH_POINTS || !pathHasMovement(path)) {
    return { fraction: null, words: NOT_ENOUGH_WORDS }
  }

  const zoneCells = cellsInZone(zone)
  if (zoneCells.size === 0) {
    return { fraction: null, words: NOT_ENOUGH_WORDS }
  }

  const visited = cellsVisitedByPath(zoneCells, path)
  const fraction = round(visited.size / zoneCells.size)
  return { fraction, words: coverageWords(fraction) }
}

/** Whether the trail has moved at all — two identical samples are still parked. */
function pathHasMovement(path: readonly GhostPathPoint[]): boolean {
  for (let i = 1; i < path.length; i += 1) {
    const previous = path[i - 1]
    const current = path[i]
    if (!previous || !current) continue
    if (previous.eastM !== current.eastM || previous.northM !== current.northM) return true
  }
  return false
}

/** Every grid cell whose area meets the Mission Zone polygon. */
function cellsInZone(zone: Zone): ReadonlySet<string> {
  const points = zone.points
  if (points.length === 0) return new Set()

  let minEast = Number.POSITIVE_INFINITY
  let maxEast = Number.NEGATIVE_INFINITY
  let minNorth = Number.POSITIVE_INFINITY
  let maxNorth = Number.NEGATIVE_INFINITY

  for (const point of points) {
    minEast = Math.min(minEast, point.eastM)
    maxEast = Math.max(maxEast, point.eastM)
    minNorth = Math.min(minNorth, point.northM)
    maxNorth = Math.max(maxNorth, point.northM)
  }

  const cell = ROUTE_COVERAGE_CELL_SIZE_M
  const startI = Math.floor(minEast / cell) - 1
  const endI = Math.ceil(maxEast / cell) + 1
  const startJ = Math.floor(minNorth / cell) - 1
  const endJ = Math.ceil(maxNorth / cell) + 1

  const keys = new Set<string>()
  for (let i = startI; i <= endI; i += 1) {
    for (let j = startJ; j <= endJ; j += 1) {
      if (cellMeetsZone(zone, i, j)) keys.add(cellKey(i, j))
    }
  }
  return keys
}

/**
 * A cell counts if its centre or any corner lies inside the polygon.
 *
 * Centre-only grids under-count small zones and sliver corners; corners catch the shape a
 * Teacher draws around desks without needing a finer cell size.
 */
function cellMeetsZone(zone: Zone, cellI: number, cellJ: number): boolean {
  const cell = ROUTE_COVERAGE_CELL_SIZE_M
  const west = cellI * cell
  const east = west + cell
  const south = cellJ * cell
  const north = south + cell

  const probes: LocalPosition[] = [
    { eastM: (west + east) / 2, northM: (south + north) / 2 },
    { eastM: west, northM: south },
    { eastM: east, northM: south },
    { eastM: east, northM: north },
    { eastM: west, northM: north },
  ]

  return probes.some((probe) => containsPoint(zone, probe))
}

/** Cells inside the zone that the trail points and segments have crossed. */
function cellsVisitedByPath(
  zoneCells: ReadonlySet<string>,
  path: readonly GhostPathPoint[],
): ReadonlySet<string> {
  const visited = new Set<string>()
  const cell = ROUTE_COVERAGE_CELL_SIZE_M

  for (const sample of samplesAlongPath(path)) {
    const key = cellKey(Math.floor(sample.eastM / cell), Math.floor(sample.northM / cell))
    if (zoneCells.has(key)) visited.add(key)
  }

  return visited
}

/** Path vertices plus samples along each segment so gaps between ticks still count. */
function samplesAlongPath(path: readonly GhostPathPoint[]): LocalPosition[] {
  const samples: LocalPosition[] = []
  const step = ROUTE_COVERAGE_CELL_SIZE_M / 2

  for (let i = 0; i < path.length; i += 1) {
    const current = path[i]
    if (!current) continue
    samples.push({ eastM: current.eastM, northM: current.northM })

    if (i === 0) continue
    const previous = path[i - 1]
    if (!previous) continue

    const runEast = current.eastM - previous.eastM
    const runNorth = current.northM - previous.northM
    const length = Math.hypot(runEast, runNorth)
    if (length === 0) continue

    for (let along = step; along < length; along += step) {
      const t = along / length
      samples.push({
        eastM: previous.eastM + t * runEast,
        northM: previous.northM + t * runNorth,
      })
    }
  }

  return samples
}

const cellKey = (cellI: number, cellJ: number) => `${cellI},${cellJ}`

const coverageWords = (fraction: number) => `${Math.round(fraction * 100)}% of the search area`

const round = (value: number) => Number(value.toFixed(4))
