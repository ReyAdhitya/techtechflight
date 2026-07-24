import { describe, expect, it } from 'vitest'
import type { DroneVitals } from './vitals'
import { formatVerticalMovement } from './vitals-presentation'

/**
 * Height with its direction, and nothing at all when there is no height to give.
 *
 * The flight strip carries this in a column of its own, beside the phase word. On the
 * ground there is no height and no direction, so the honest value is nothing — the phase
 * word already says "On the ground". This function used to return that same phrase, so a
 * grounded Drone printed it twice in one row; and "0.0 m" would have been worse, a
 * measurement where a plain fact belongs.
 */

const aVitals = (overrides: Partial<DroneVitals> = {}): DroneVitals => ({
  droneId: 'ttf-0001',
  callsign: 'Drone 1',
  status: 'Flying',
  phase: 'level',
  airborne: true,
  altitudeM: 1.5,
  verticalRateMps: 0,
  batteryFraction: 0.6,
  enduranceMs: null,
  responseAgeMs: 1_000,
  position: { eastM: 0, northM: 0 },
  separationM: null,
  conflictWith: null,
  alerts: [],
  ...overrides,
})

describe('height on the flight strip', () => {
  it('gives nothing for a Drone on the ground, so the phase word is not echoed', () => {
    // Read from the airframe, not the phase: a latched emergency stop is `emergency`
    // whether the Drone is on a desk or falling, so only `airborne` answers this.
    expect(formatVerticalMovement(aVitals({ airborne: false, phase: 'on-ground' }))).toBeNull()
    expect(formatVerticalMovement(aVitals({ airborne: false, phase: 'emergency' }))).toBeNull()
  })

  it('says the height plainly when the Drone is holding level', () => {
    expect(formatVerticalMovement(aVitals({ altitudeM: 1.7, verticalRateMps: 0 }))).toBe(
      '1.7 m · steady',
    )
  })

  it('attaches the direction when the Drone is moving', () => {
    expect(formatVerticalMovement(aVitals({ altitudeM: 2, verticalRateMps: 0.4 }))).toBe(
      '2.0 m · ↑ 0.4 m/s',
    )
    expect(formatVerticalMovement(aVitals({ altitudeM: 1.2, verticalRateMps: -0.4 }))).toBe(
      '1.2 m · ↓ 0.4 m/s',
    )
  })

  it('says the height cannot be read rather than drawing a zero', () => {
    // Airborne and no rangefinder is a different fact from airborne at zero metres, and
    // the two must never get the same picture (docs/DESIGN.md §11.1).
    expect(formatVerticalMovement(aVitals({ airborne: true, altitudeM: null }))).toBe(
      'Height not reported',
    )
  })
})
