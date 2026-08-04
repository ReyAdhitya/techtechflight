import { describe, expect, it } from 'vitest'
import {
  areaM2,
  breachesAt,
  containsPoint,
  distanceToEdge,
  enclosesAnything,
  metresToNearestLimit,
  type Zone,
} from './airspace.ts'

/**
 * The geometry the no-fly Alert rests on.
 *
 * This is the one part of the mission layer jsdom can check completely — there is no
 * layout in it, only arithmetic — so it is checked completely, including the cases a
 * classroom will produce and a demonstration will not: concave shapes, a Drone exactly on
 * a corner, and a zone nobody has finished drawing.
 */

const square = (id: string, kind: Zone['kind'], size = 4): Zone => ({
  id,
  kind,
  name: id,
  points: [
    { eastM: 0, northM: 0 },
    { eastM: size, northM: 0 },
    { eastM: size, northM: size },
    { eastM: 0, northM: size },
  ],
})

/** An L, so the concave case is a real one rather than a rectangle with a dent. */
const ell: Zone = {
  id: 'ell',
  kind: 'no-fly',
  name: 'the corner by the desks',
  points: [
    { eastM: 0, northM: 0 },
    { eastM: 6, northM: 0 },
    { eastM: 6, northM: 2 },
    { eastM: 2, northM: 2 },
    { eastM: 2, northM: 6 },
    { eastM: 0, northM: 6 },
  ],
}

describe('a zone still being drawn', () => {
  it('encloses nothing until it has three points', () => {
    const twoTaps: Zone = {
      id: 'z',
      kind: 'mission',
      name: 'half a zone',
      points: [
        { eastM: 0, northM: 0 },
        { eastM: 3, northM: 0 },
      ],
    }

    expect(enclosesAnything(twoTaps)).toBe(false)
    // Nothing is inside nothing — not even the point the Teacher just tapped.
    expect(containsPoint(twoTaps, { eastM: 1, northM: 0 })).toBe(false)
    expect(areaM2(twoTaps)).toBe(0)
  })
})

describe('whether a point is inside', () => {
  const zone = square('room', 'mission')

  it('finds the middle', () => {
    expect(containsPoint(zone, { eastM: 2, northM: 2 })).toBe(true)
  })

  it('finds a point well outside', () => {
    expect(containsPoint(zone, { eastM: 9, northM: 2 })).toBe(false)
    expect(containsPoint(zone, { eastM: -1, northM: 2 })).toBe(false)
  })

  it('handles a concave shape rather than its bounding box', () => {
    /*
     * The whole reason ray casting is worth the arithmetic. This point sits inside the
     * rectangle that would enclose the L, and outside the L itself. A bounding-box test
     * would put a Drone in a no-fly zone it is nowhere near.
     */
    expect(containsPoint(ell, { eastM: 5, northM: 5 })).toBe(false)
    expect(containsPoint(ell, { eastM: 1, northM: 5 })).toBe(true)
    expect(containsPoint(ell, { eastM: 5, northM: 1 })).toBe(true)
  })

  it('does not lose a Drone level with a corner', () => {
    /*
     * A ray passing exactly through a vertex is the classic double-count. Level with the
     * top edge of the L's tall arm, well inside it — this reads as outside without the
     * half-open edge test, and it is a position a Drone parked on a grid line reaches
     * constantly.
     */
    expect(containsPoint(ell, { eastM: 1, northM: 2 })).toBe(true)
  })
})

describe('distance to the edge', () => {
  const zone = square('room', 'mission')

  it('is the shortest way out, from inside', () => {
    // A metre from the west edge, three from the east.
    expect(distanceToEdge(zone, { eastM: 1, northM: 2 })).toBe(1)
  })

  it('is positive from outside too, because the question is the same', () => {
    expect(distanceToEdge(zone, { eastM: 6, northM: 2 })).toBe(2)
  })

  it('measures to a corner when the corner is nearest', () => {
    // Diagonally off the north-east corner: 3-4-5.
    expect(distanceToEdge(zone, { eastM: 7, northM: 8 })).toBe(5)
  })

  it('says nothing about a zone with no edges', () => {
    const single: Zone = { id: 'z', kind: 'mission', name: 'a tap', points: [] }
    expect(distanceToEdge(single, { eastM: 0, northM: 0 })).toBeNull()
  })
})

describe('area', () => {
  it('measures a square', () => {
    expect(areaM2(square('room', 'mission', 5))).toBe(25)
  })

  it('does not care which way round the Teacher drew it', () => {
    const clockwise: Zone = {
      id: 'z',
      kind: 'mission',
      name: 'z',
      points: [...square('z', 'mission').points].reverse(),
    }
    expect(areaM2(clockwise)).toBe(16)
  })
})

describe('what a position breaches', () => {
  const mission = square('mission', 'mission', 10)
  const noFly: Zone = {
    id: 'nofly',
    kind: 'no-fly',
    name: 'over the desks',
    points: [
      { eastM: 6, northM: 6 },
      { eastM: 9, northM: 6 },
      { eastM: 9, northM: 9 },
      { eastM: 6, northM: 9 },
    ],
  }

  it('is quiet where a Drone is meant to be', () => {
    expect(breachesAt([mission, noFly], { eastM: 2, northM: 2 })).toEqual([])
  })

  it('names leaving the Mission Zone', () => {
    const [breach] = breachesAt([mission, noFly], { eastM: 12, northM: 2 })
    expect(breach?.kind).toBe('left-mission-zone')
    expect(breach?.zoneName).toBe('mission')
  })

  it('names entering a No-fly Zone', () => {
    const [breach] = breachesAt([mission, noFly], { eastM: 7, northM: 7 })
    expect(breach?.kind).toBe('entered-no-fly')
    expect(breach?.zoneName).toBe('over the desks')
  })

  it('puts the No-fly Zone first when a Drone has done both', () => {
    /*
     * A No-fly Zone that overhangs the Mission Zone's edge. The Drone is out of bounds and
     * somewhere dangerous, and "get out" is the sentence that matters — "come back" would
     * send it further in.
     */
    const overhang: Zone = {
      id: 'overhang',
      kind: 'no-fly',
      name: 'the netting',
      points: [
        { eastM: 9, northM: 0 },
        { eastM: 14, northM: 0 },
        { eastM: 14, northM: 5 },
        { eastM: 9, northM: 5 },
      ],
    }
    const breaches = breachesAt([mission, overhang], { eastM: 12, northM: 2 })

    expect(breaches).toHaveLength(2)
    expect(breaches[0]?.kind).toBe('entered-no-fly')
    expect(breaches[1]?.kind).toBe('left-mission-zone')
  })

  it('has no opinion when no Mission Zone has been drawn', () => {
    // The whole of the first lesson looks like this. Absence must not read as an alarm.
    expect(breachesAt([noFly], { eastM: 50, northM: 50 })).toEqual([])
  })

  it('ignores a zone the Teacher has not finished', () => {
    const half: Zone = {
      id: 'half',
      kind: 'no-fly',
      name: 'half drawn',
      points: [
        { eastM: 0, northM: 0 },
        { eastM: 1, northM: 0 },
      ],
    }
    expect(breachesAt([half], { eastM: 0.5, northM: 0 })).toEqual([])
  })
})

describe('how much room is left', () => {
  it('says nothing at all when nothing is drawn', () => {
    // Null, not Infinity. "Not measured" and "miles of room" are different sentences.
    expect(metresToNearestLimit([], { eastM: 0, northM: 0 })).toBeNull()
  })

  it('reports the nearest limit of any kind', () => {
    const mission = square('mission', 'mission', 10)
    const noFly: Zone = {
      id: 'nofly',
      kind: 'no-fly',
      name: 'desks',
      points: [
        { eastM: 4, northM: 4 },
        { eastM: 6, northM: 4 },
        { eastM: 6, northM: 6 },
        { eastM: 4, northM: 6 },
      ],
    }

    // Three metres from the Mission Zone's west edge, one from the no-fly's west edge.
    expect(metresToNearestLimit([mission, noFly], { eastM: 3, northM: 5 })).toBe(1)
  })
})
