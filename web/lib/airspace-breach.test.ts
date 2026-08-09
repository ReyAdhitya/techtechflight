import { describe, expect, it } from 'vitest'
import { breachesAt, type Zone } from './airspace.ts'
import { BreachTracker, breachKey } from './airspace-breach.ts'

/**
 * Rising-edge zone breaches — the acceptance case is a Drone parked on a boundary.
 *
 * `breachesAt` keeps saying the same thing; this layer must say it once, then wait for
 * the Drone to come back in bounds before it speaks again.
 */

const hallZone: Zone = {
  id: 'hall',
  kind: 'no-fly',
  name: 'the hall',
  points: [
    { eastM: 0, northM: 0 },
    { eastM: 10, northM: 0 },
    { eastM: 10, northM: 10 },
    { eastM: 0, northM: 10 },
  ],
}

const noFlyZone: Zone = {
  id: 'netting',
  kind: 'no-fly',
  name: 'the netting',
  points: [
    { eastM: 12, northM: 0 },
    { eastM: 16, northM: 0 },
    { eastM: 16, northM: 4 },
    { eastM: 12, northM: 4 },
  ],
}

const insideHall = { eastM: 5, northM: 5 }
const insideNoFly = { eastM: 14, northM: 2 }
const safeOutside = { eastM: -1, northM: -1 }

describe('breachKey', () => {
  it('separates Drone, kind, and zone', () => {
    expect(
      breachKey('d1', {
        kind: 'entered-no-fly',
        zoneId: 'hall',
        zoneName: 'the hall',
      }),
    ).toBe('d1:entered-no-fly:hall')
  })
})

describe('BreachTracker', () => {
  it('raises one breach while a craft hovers out of place, not forty', () => {
    const tracker = new BreachTracker()
    const zones = [hallZone]
    const breach = breachesAt(zones, insideHall)[0]!

    const events = []
    for (let tick = 0; tick < 40; tick += 1) {
      events.push(...tracker.observe('d1', [breach], 1_000 + tick))
    }

    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({
      ...breach,
      droneId: 'd1',
      at: 1_000,
    })
  })

  it('raises a second breach after leaving and re-entering', () => {
    const tracker = new BreachTracker()
    const zones = [hallZone]
    const breach = breachesAt(zones, insideHall)[0]!

    const first = tracker.observe('d1', [breach], 1_000)
    expect(first).toHaveLength(1)

    // Back inside — the condition clears.
    expect(tracker.observe('d1', [], 5_000)).toEqual([])

    const second = tracker.observe('d1', [breach], 9_000)
    expect(second).toHaveLength(1)
    expect(second[0]!.at).toBe(9_000)
  })

  it('tracks each zone separately on one Drone', () => {
    const tracker = new BreachTracker()
    const zones = [hallZone, noFlyZone]
    const inNetting = breachesAt(zones, insideNoFly)
    const inHall = breachesAt(zones, insideHall)

    expect(tracker.observe('d1', inHall, 2_000)).toHaveLength(1)
    expect(tracker.observe('d1', inHall, 2_500)).toEqual([])

    // A different zone is a different breach, not the same one repeating.
    const crossed = tracker.observe('d1', inNetting, 3_000)
    expect(crossed).toHaveLength(1)
    expect(crossed[0]!.zoneName).toBe('the netting')

    // And going back into the first one speaks again, because it stopped in between.
    expect(tracker.observe('d1', inHall, 4_000)).toHaveLength(1)
  })

  it('keeps Drones independent in a fleet-wide observe', () => {
    const tracker = new BreachTracker()
    const zones = [hallZone]
    const breach = breachesAt(zones, insideHall)[0]!

    const first = tracker.observeFleet(
      [
        { droneId: 'a', breaches: [breach] },
        { droneId: 'b', breaches: [] },
      ],
      1_000,
    )
    expect(first).toHaveLength(1)
    expect(first[0]!.droneId).toBe('a')

    const steady = tracker.observeFleet(
      [
        { droneId: 'a', breaches: [breach] },
        { droneId: 'b', breaches: [breach] },
      ],
      2_000,
    )
    expect(steady).toHaveLength(1)
    expect(steady[0]!.droneId).toBe('b')
  })

  it('forgets everything on reset', () => {
    const tracker = new BreachTracker()
    const zones = [hallZone]
    const breach = breachesAt(zones, insideHall)[0]!

    tracker.observe('d1', [breach], 1_000)
    tracker.reset()

    const again = tracker.observe('d1', [breach], 2_000)
    expect(again).toHaveLength(1)
    expect(again[0]!.at).toBe(2_000)
  })

  it('walks a position series through breachesAt like a live Integrator would', () => {
    const tracker = new BreachTracker()
    const zones = [hallZone, noFlyZone]
    const positions = [safeOutside, insideHall, insideHall, insideNoFly]
    const allEvents = []

    for (let i = 0; i < positions.length; i += 1) {
      const breaches = breachesAt(zones, positions[i]!)
      allEvents.push(...tracker.observe('d1', breaches, i * 1_000))
    }

    expect(allEvents).toHaveLength(2)
    expect(allEvents[0]!.kind).toBe('entered-no-fly')
    expect(allEvents[1]!.kind).toBe('entered-no-fly')
  })
})
