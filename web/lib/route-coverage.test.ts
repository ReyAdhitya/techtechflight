import { describe, expect, it } from 'vitest'

import { type Zone } from './airspace.ts'
import { routeCoverage, ROUTE_COVERAGE_CELL_SIZE_M } from './route-coverage.ts'
import type { GhostPathPoint } from './scope-ghost-paths.ts'

/**
 * Mission Zone coverage from the ghost-path trail.
 *
 * Grid arithmetic only — the same class of test as `airspace.test.ts`. The cases that
 * matter in a classroom: a zone still being drawn, a craft parked on the pad, a trail that
 * never entered the search area, and a concave Mission Zone around the desks.
 */

const square = (size = 4): Zone => ({
  id: 'mission',
  kind: 'no-fly',
  name: 'the hall',
  points: [
    { eastM: 0, northM: 0 },
    { eastM: size, northM: 0 },
    { eastM: size, northM: size },
    { eastM: 0, northM: size },
  ],
})

const point = (eastM: number, northM: number, at = 0): GhostPathPoint => ({
  eastM,
  northM,
  altitudeM: null,
  at,
})

/** An L-shaped Mission Zone — concave, not its bounding box. */
const ellZone: Zone = {
  id: 'ell',
  kind: 'no-fly',
  name: 'around the desks',
  points: [
    { eastM: 0, northM: 0 },
    { eastM: 6, northM: 0 },
    { eastM: 6, northM: 2 },
    { eastM: 2, northM: 2 },
    { eastM: 2, northM: 6 },
    { eastM: 0, northM: 6 },
  ],
}

describe('when coverage cannot be said yet', () => {
  it('refuses a zone the Teacher has not closed', () => {
    const halfDrawn: Zone = {
      id: 'z',
      kind: 'no-fly',
      name: 'half',
      points: [
        { eastM: 0, northM: 0 },
        { eastM: 3, northM: 0 },
      ],
    }

    const result = routeCoverage(halfDrawn, [point(1, 1, 0), point(2, 2, 1000)])
    expect(result.fraction).toBeNull()
    expect(result.words).toBe('Not enough track yet')
  })

  it('refuses an empty trail', () => {
    const result = routeCoverage(square(), [])
    expect(result.fraction).toBeNull()
    expect(result.words).toBe('Not enough track yet')
  })

  it('refuses a single sample — no segment yet', () => {
    const result = routeCoverage(square(), [point(2, 2)])
    expect(result.fraction).toBeNull()
    expect(result.words).toBe('Not enough track yet')
  })

  it('refuses two samples at the same place — parked, not searching', () => {
    const result = routeCoverage(square(), [point(2, 2, 0), point(2, 2, 500)])
    expect(result.fraction).toBeNull()
    expect(result.words).toBe('Not enough track yet')
  })
})

describe('when the trail is measurable', () => {
  it('reports zero when the craft never entered the Mission Zone', () => {
    const result = routeCoverage(square(), [point(-10, -10, 0), point(-9, -10, 1000)])
    expect(result.fraction).toBe(0)
    expect(result.words).toBe('0% of the search area')
  })

  it('counts one row of a square zone as partial coverage', () => {
    /*
     * A 4×4 m zone on a 1 m grid yields twenty-five cells once edge overlap is counted.
     * A trail along the south edge at north = 0.5 m crosses four of them.
     */
    const result = routeCoverage(
      square(),
      [point(0.5, 0.5, 0), point(3.5, 0.5, 1000)],
    )
    expect(result.fraction).toBe(0.16)
    expect(result.words).toBe('16% of the search area')
  })

  it('samples segments so a long jump still marks cells between ticks', () => {
    /*
     * Two endpoints three metres apart with no intermediate ghost-path points. Segment
     * sampling should still paint the middle cells, not just the ends.
     */
    const result = routeCoverage(
      square(),
      [point(0.5, 0.5, 0), point(3.5, 0.5, 1000)],
    )
    expect(result.fraction).toBe(0.16)
  })

  it('reaches full coverage when the trail crosses every cell', () => {
    const path: GhostPathPoint[] = []
    let at = 0
    for (let row = -1; row <= 5; row += 1) {
      for (let col = -1; col <= 5; col += 1) {
        path.push(point(col + 0.5, row + 0.5, at))
        at += 100
      }
    }

    const result = routeCoverage(square(), path)
    expect(result.fraction).toBe(1)
    expect(result.words).toBe('100% of the search area')
  })

  it('respects a concave Mission Zone rather than its bounding box', () => {
    /*
     * The void in the L's elbow (5, 5) is outside the zone. A trail through that void
     * must not inflate coverage; a trail through the tall west arm must count only cells
     * inside the L.
     */
    const throughVoid = routeCoverage(ellZone, [point(5, 5, 0), point(5.5, 5.5, 1000)])
    expect(throughVoid.fraction).toBe(0)

    const westArm = routeCoverage(ellZone, [point(0.5, 3, 0), point(0.5, 5.5, 1000)])
    expect(westArm.fraction).toBeGreaterThan(0)
    expect(westArm.fraction).toBeLessThan(1)
  })

  it('documents the cell size as one metre', () => {
    expect(ROUTE_COVERAGE_CELL_SIZE_M).toBe(1)
  })
})

describe('the words a Teacher reads', () => {
  it('rounds to a whole percentage', () => {
    const zone = square()
    const result = routeCoverage(zone, [point(0.5, 0.5, 0), point(1.5, 0.5, 1000)])
    expect(result.words).toMatch(/^\d+% of the search area$/)
    expect(result.words).not.toContain('.')
    expect(result.words).toBe('8% of the search area')
  })
})
