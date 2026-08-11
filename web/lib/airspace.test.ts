import { describe, expect, it } from 'vitest'
import {
  areaM2,
  breachesAt,
  containsPoint,
  distanceToEdge,
  enclosesAnything,
  metresToNearestLimit,
  zoneShowsInWindow,
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
      kind: 'no-fly',
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
  const zone = square('room', 'no-fly')

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
  const zone = square('room', 'no-fly')

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
    const single: Zone = { id: 'z', kind: 'no-fly', name: 'a tap', points: [] }
    expect(distanceToEdge(single, { eastM: 0, northM: 0 })).toBeNull()
  })
})

describe('area', () => {
  it('measures a square', () => {
    expect(areaM2(square('room', 'no-fly', 5))).toBe(25)
  })

  it('does not care which way round the Teacher drew it', () => {
    const clockwise: Zone = {
      id: 'z',
      kind: 'no-fly',
      name: 'z',
      points: [...square('z', 'no-fly').points].reverse(),
    }
    expect(areaM2(clockwise)).toBe(16)
  })
})

/**
 * Only no-go areas are drawn (ADR-0027), so there is one kind of breach left.
 *
 * `'left-mission-zone'` went with the go-area: the netting is what says a Drone has gone too
 * far, and a drawn boundary that disagreed with the netting taught a class to ignore the board.
 */
describe('what a position breaches', () => {
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
    expect(breachesAt([noFly], { eastM: 2, northM: 2 })).toEqual([])
  })

  /* A long way from every drawn zone is not a breach. The cage is what bounds the room. */
  it('says nothing about a Drone that is simply a long way off', () => {
    expect(breachesAt([noFly], { eastM: 50, northM: 50 })).toEqual([])
  })

  it('names entering a No-fly Zone', () => {
    const [breach] = breachesAt([noFly], { eastM: 7, northM: 7 })
    expect(breach?.kind).toBe('entered-no-fly')
    expect(breach?.zoneName).toBe('over the desks')
  })

  it('names every No-fly Zone a Drone is inside, not only the first', () => {
    const overlapping: Zone = {
      id: 'overlap',
      kind: 'no-fly',
      name: 'the netting',
      points: [
        { eastM: 5, northM: 5 },
        { eastM: 10, northM: 5 },
        { eastM: 10, northM: 10 },
        { eastM: 5, northM: 10 },
      ],
    }
    const breaches = breachesAt([noFly, overlapping], { eastM: 7, northM: 7 })

    expect(breaches).toHaveLength(2)
    expect(breaches.map((breach) => breach.zoneName)).toEqual(['over the desks', 'the netting'])
  })

  it('has no opinion when nothing has been drawn', () => {
    // The whole of the first lesson looks like this. Absence must not read as an alarm.
    expect(breachesAt([], { eastM: 50, northM: 50 })).toEqual([])
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
    const wide = square('wide', 'no-fly', 10)
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

    // Three metres from the wide zone's west edge, one from the small one's west edge.
    expect(metresToNearestLimit([wide, noFly], { eastM: 3, northM: 5 })).toBe(1)
  })
})

/**
 * Whether a zone is on the picture at all.
 *
 * The Scope's window is fixed (ADR-0014), so this is a question with a real answer rather
 * than always yes: a zone can exist, be drawn correctly, and land entirely off the frame.
 * The key underneath the picture may only name what is in it.
 */
describe('a zone against the Scope window', () => {
  const window8m = { westM: 0, southM: 0, widthM: 8, heightM: 8 }

  const box = (eastM: number, northM: number, size = 2): Zone => ({
    id: `z-${eastM}-${northM}`,
    kind: 'no-fly',
    name: 'a box',
    points: [
      { eastM, northM },
      { eastM: eastM + size, northM },
      { eastM: eastM + size, northM: northM + size },
      { eastM, northM: northM + size },
    ],
  })

  it('shows a zone inside the window', () => {
    expect(zoneShowsInWindow(box(2, 2), 'top-down', window8m)).toBe(true)
  })

  it('shows a zone that only overlaps the edge', () => {
    expect(zoneShowsInWindow(box(-1, 3), 'top-down', window8m)).toBe(true)
  })

  /* The case the key was lying about. */
  it('refuses a zone entirely off the frame', () => {
    expect(zoneShowsInWindow(box(40, 40), 'top-down', window8m)).toBe(false)
    expect(zoneShowsInWindow(box(2, 40), 'top-down', window8m)).toBe(false)
  })

  /*
   * Touching the edge counts, because the Scope holds a shape on the frame rather than
   * dropping it: the boundary line is drawn, and it is worth naming. A zone entirely past the
   * edge draws nothing and is not.
   */
  it('keeps a zone that reaches the edge and refuses one beyond it', () => {
    expect(zoneShowsInWindow(box(8, 3), 'top-down', window8m)).toBe(true)
    expect(zoneShowsInWindow(box(9, 3), 'top-down', window8m)).toBe(false)
    expect(zoneShowsInWindow(box(-5, 3), 'top-down', window8m)).toBe(false)
  })

  /*
   * The elevation views flatten one axis. A zone away to the east is still at those heights
   * and those northings, so Side draws it and Side's key may say so; Front, which reads east
   * across the picture, may not.
   */
  it('reads only the axis the elevation view draws', () => {
    const eastOfTheWindow = box(40, 3)

    expect(zoneShowsInWindow(eastOfTheWindow, 'side', window8m)).toBe(true)
    expect(zoneShowsInWindow(eastOfTheWindow, 'front', window8m)).toBe(false)
    expect(zoneShowsInWindow(eastOfTheWindow, 'top-down', window8m)).toBe(false)
  })

  it('refuses a zone still being drawn, wherever it is', () => {
    const halfDrawn: Zone = {
      id: 'half',
      kind: 'no-fly',
      name: 'half a zone',
      points: [
        { eastM: 2, northM: 2 },
        { eastM: 4, northM: 2 },
      ],
    }

    expect(zoneShowsInWindow(halfDrawn, 'top-down', window8m)).toBe(false)
  })
})
