import { describe, expect, it } from 'vitest'
import type { DroneVitals } from './vitals'
import {
  formatCoordinates,
  formatVerticalMovement,
  PHASE_PRESENTATION,
} from './vitals-presentation'

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
  groundSpeedMps: null,
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
  /*
   * This gave nothing at all until the phase word was dropped from the strip. The word was
   * carrying "On the ground", so a second cell saying it too printed the fact twice — and
   * with the word gone, silence here would leave the strip saying nothing about where a
   * grounded Drone is.
   */
  it('gives a grounded Drone its height, with no movement attached to it', () => {
    // Read from the airframe, not the phase: a latched emergency stop is `emergency`
    // whether the Drone is on a desk or falling, so only `airborne` answers this.
    expect(
      formatVerticalMovement(aVitals({ airborne: false, phase: 'on-ground', altitudeM: 0 })),
    ).toBe('0.0 m')
    expect(
      formatVerticalMovement(aVitals({ airborne: false, phase: 'emergency', altitudeM: 0 })),
    ).toBe('0.0 m')
  })

  /* "steady" is a measurement of stillness, and a Drone on the floor is not holding a height. */
  it('does not call a grounded Drone steady, however still it is', () => {
    const grounded = aVitals({ airborne: false, altitudeM: 0, verticalRateMps: 0 })

    expect(formatVerticalMovement(grounded)).not.toMatch(/steady|↑|↓/)
  })

  /*
   * The acceptance item for dropping the phase word: what the strip needs from a climbing
   * Drone is the rate, which is the answer to "is it going up or down". The word "Climbing"
   * only repeated what an upward arrow beside a rising number already says.
   */
  it('gives a climbing Drone its rate, and never the word for it', () => {
    const climbing = formatVerticalMovement(
      aVitals({ airborne: true, phase: 'climbing', altitudeM: 2.6, verticalRateMps: 0.8 }),
    )

    expect(climbing).toBe('2.6 m · ↑ 0.8 m/s')
    for (const { label } of Object.values(PHASE_PRESENTATION)) {
      expect(climbing, label).not.toContain(label)
    }
  })

  /* The one absence that survives: no barometer is not the same fact as measuring zero. */
  it('still says so in words when a grounded Drone cannot measure its height', () => {
    expect(
      formatVerticalMovement(aVitals({ airborne: false, altitudeM: null })),
    ).toBe('Height not reported')
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

/**
 * Where a Drone is, as three numbers.
 *
 * Added on every strip on 2026-07-28, which required `docs/DESIGN.md` §1.2 to be narrowed —
 * numbers are not the primary language, and this sits beside the instruction rather than in
 * place of it. What is worth testing hardest is the absences: the two ways a reading can be
 * missing, which §11.1 requires to be drawn differently from a zero.
 */
describe('the coordinate group', () => {
  it('labels each axis with its letter and its direction', () => {
    expect(
      formatCoordinates(aVitals({ position: { eastM: 2.4, northM: 1.1 }, altitudeM: 1.7 })),
    ).toBe('X 2.4 m E · Y 1.1 m N · Z 1.7 m')
  })

  it('turns the sign into the direction a Teacher would say out loud', () => {
    expect(
      formatCoordinates(aVitals({ position: { eastM: -2.4, northM: -1.1 }, altitudeM: 0.5 })),
    ).toBe('X 2.4 m W · Y 1.1 m S · Z 0.5 m')
  })

  /*
   * 0 m east and 0 m west are the same place. Picking one would be noise dressed as
   * precision, and the demonstration Fleet sits on the north axis, so this is the common
   * case rather than an edge one.
   */
  it('claims no direction where there is none', () => {
    expect(
      formatCoordinates(aVitals({ position: { eastM: 0, northM: 3 }, altitudeM: 0 })),
    ).toBe('X 0.0 m · Y 3.0 m N · Z 0.0 m')
  })

  /*
   * The acceptance item. An airframe with no barometer and one sitting on the floor are
   * different facts, and drawing the first as the second tells a Teacher something false.
   */
  it('says a height was not reported rather than drawing a zero', () => {
    const line = formatCoordinates(aVitals({ position: { eastM: 1, northM: 1 }, altitudeM: null }))

    expect(line).toBe('X 1.0 m E · Y 1.0 m N · Z not reported')
    expect(line).not.toMatch(/Z .*0/)
  })

  it('draws a real zero as a reading, because that is what it is', () => {
    expect(
      formatCoordinates(aVitals({ position: { eastM: 1, northM: 1 }, altitudeM: 0 })),
    ).toBe('X 1.0 m E · Y 1.0 m N · Z 0.0 m')
  })

  /*
   * No line at all rather than a row of dashes. A group full of placeholders reads as a
   * measurement that failed, when the truth is that none was offered.
   */
  it('gives nothing at all for a Drone that has not said where it is', () => {
    expect(formatCoordinates(aVitals({ position: null }))).toBeNull()
  })

  /* The detail dialog hands it a Telemetry, where absence is `undefined` rather than `null`. */
  it('reads a Telemetry as happily as a Vitals', () => {
    expect(formatCoordinates({ position: { eastM: 2, northM: 0 } })).toBe(
      'X 2.0 m E · Y 0.0 m · Z not reported',
    )
    expect(formatCoordinates({})).toBeNull()
  })
})
