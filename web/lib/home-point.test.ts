import { describe, expect, it } from 'vitest'
import { HomePointTracker, homePointWords } from './home-point'

/**
 * Where Recall means, and why it is taken rather than asked for.
 *
 * Recall has said "return to the launch point" since it shipped, and until now nothing
 * recorded one. The rule is automatic and per Drone: wherever that Drone was standing when
 * it left the ground.
 */

const at = (eastM: number, northM: number) => ({ eastM, northM })

describe('the point Recall returns to', () => {
  it('is where the Drone was standing on the last frame before it left the ground', () => {
    const tracker = new HomePointTracker()

    tracker.observe([{ droneId: 'd1', airborne: false, position: at(3, 1) }])
    // Carried across the hall before takeoff. The bench is not where it left from.
    tracker.observe([{ droneId: 'd1', airborne: false, position: at(9, 4) }])
    tracker.observe([{ droneId: 'd1', airborne: true, position: at(9.2, 4.1) }])

    expect(tracker.homeOf('d1')).toEqual(at(9, 4))
  })

  it('does not move once the Drone is up', () => {
    const tracker = new HomePointTracker()

    tracker.observe([{ droneId: 'd1', airborne: false, position: at(2, 2) }])
    tracker.observe([{ droneId: 'd1', airborne: true, position: at(2, 2) }])
    tracker.observe([{ droneId: 'd1', airborne: true, position: at(14, 9) }])

    expect(tracker.homeOf('d1')).toEqual(at(2, 2))
  })

  /* Six craft Recalled to one square metre collide. */
  it('is one per Drone, never one for the class', () => {
    const tracker = new HomePointTracker()

    tracker.observe([
      { droneId: 'd1', airborne: false, position: at(0, 0) },
      { droneId: 'd2', airborne: false, position: at(1, 0) },
    ])
    tracker.observe([
      { droneId: 'd1', airborne: true, position: at(0, 0) },
      { droneId: 'd2', airborne: true, position: at(1, 0) },
    ])

    expect(tracker.homeOf('d1')).toEqual(at(0, 0))
    expect(tracker.homeOf('d2')).toEqual(at(1, 0))
  })

  it('takes the new spot when the same Drone flies a second time from somewhere else', () => {
    const tracker = new HomePointTracker()

    tracker.observe([{ droneId: 'd1', airborne: false, position: at(0, 0) }])
    tracker.observe([{ droneId: 'd1', airborne: true, position: at(0, 0) }])
    tracker.observe([{ droneId: 'd1', airborne: false, position: at(6, 6) }])
    tracker.observe([{ droneId: 'd1', airborne: true, position: at(6, 6) }])

    expect(tracker.homeOf('d1')).toEqual(at(6, 6))
  })

  /* No invented readings. A Drone the board has only ever seen up has no launch point. */
  it('says nothing about a Drone it never saw on the ground', () => {
    const tracker = new HomePointTracker()

    tracker.observe([{ droneId: 'd1', airborne: true, position: at(5, 5) }])

    expect(tracker.homeOf('d1')).toEqual(at(5, 5))
    expect(tracker.homeOf('d2')).toBeNull()
  })

  it('does not invent a home for a Drone that is not reporting a position', () => {
    const tracker = new HomePointTracker()

    tracker.observe([{ droneId: 'd1', airborne: false, position: null }])
    tracker.observe([{ droneId: 'd1', airborne: true, position: null }])

    expect(tracker.homeOf('d1')).toBeNull()
  })

  it('forgets everything on reset', () => {
    const tracker = new HomePointTracker()

    tracker.observe([{ droneId: 'd1', airborne: false, position: at(1, 1) }])
    tracker.observe([{ droneId: 'd1', airborne: true, position: at(1, 1) }])
    tracker.reset()

    expect(tracker.homeOf('d1')).toBeNull()
  })
})

describe('saying where home is', () => {
  it('reads in metres from the Fleet origin, never a latitude', () => {
    expect(homePointWords({ eastM: 3, northM: 1.25 })).toBe('3.0 m east, 1.3 m north')
  })

  it('says an absent one in words rather than as a zero', () => {
    expect(homePointWords(null)).toBe('Not seen taking off')
  })
})
