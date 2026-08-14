import { aTelemetry } from '@techtechflight/contract/fixtures'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  emptyPreFlightSeven,
  evaluatePreFlightSeven,
  isPreFlightSevenDone,
  PRE_FLIGHT_SEVEN_ITEMS,
  PRE_FLIGHT_SEVEN_KEY,
  preFlightSevenDoneCount,
  preFlightSevenStatusWord,
  propellersTicked,
  readPreFlightSeven,
  resetPreFlightSeven,
  togglePropellersTick,
} from './preflight-seven'

beforeEach(() => {
  window.localStorage.removeItem(PRE_FLIGHT_SEVEN_KEY)
})

afterEach(() => {
  window.localStorage.removeItem(PRE_FLIGHT_SEVEN_KEY)
})

describe('pre-flight seven items', () => {
  it('has a fixed list of seven checks in board order', () => {
    expect(PRE_FLIGHT_SEVEN_ITEMS).toHaveLength(7)
    expect(PRE_FLIGHT_SEVEN_ITEMS.map((item) => item.id)).toEqual([
      'battery',
      'propellers',
      'sensors',
      'wifi',
      'camera',
      'altitude-hold',
      'obstacle-sensing',
    ])
    expect(PRE_FLIGHT_SEVEN_ITEMS.filter((item) => item.manual)).toEqual([
      { id: 'propellers', label: 'Propellers', manual: true },
    ])
  })

  it('reads battery, sensors and obstacle from Telemetry', () => {
    const readings = evaluatePreFlightSeven(
      aTelemetry({
        batteryFraction: 0.82,
        orientation: { pitchDegrees: 0, rollDegrees: 0, yawDegrees: 0 },
        camera: { streaming: false },
        proximity: null,
        linkQuality: 0.9,
        extra: { altitudeHold: true },
      }),
      false,
    )

    expect(readings.find((item) => item.id === 'battery')).toMatchObject({
      status: 'pass',
    })
    expect(readings.find((item) => item.id === 'sensors')).toMatchObject({
      status: 'pass',
    })
    expect(readings.find((item) => item.id === 'wifi')).toMatchObject({
      status: 'pass',
      detail: expect.stringContaining('90%'),
    })
    expect(readings.find((item) => item.id === 'camera')).toMatchObject({
      status: 'pass',
    })
    expect(readings.find((item) => item.id === 'altitude-hold')).toMatchObject({
      status: 'pass',
    })
    expect(readings.find((item) => item.id === 'obstacle-sensing')).toMatchObject({
      status: 'pass',
      detail: expect.stringContaining('Nothing close'),
    })
    expect(readings.find((item) => item.id === 'propellers')).toMatchObject({
      status: 'pending',
    })
  })

  it('says when an item cannot be reported', () => {
    const readings = evaluatePreFlightSeven(
      aTelemetry({
        batteryFraction: 0.82,
        orientation: { pitchDegrees: 0, rollDegrees: 0, yawDegrees: 0 },
      }),
      false,
    )

    expect(readings.find((item) => item.id === 'wifi')?.detail).toMatch(
      /cannot report signal strength/i,
    )
    expect(readings.find((item) => item.id === 'camera')?.detail).toBe('No camera fitted.')
    expect(readings.find((item) => item.id === 'altitude-hold')?.detail).toMatch(
      /cannot report altitude hold/i,
    )
    expect(readings.find((item) => item.id === 'obstacle-sensing')?.detail).toMatch(
      /no obstacle sensor fitted/i,
    )
  })

  it('flags low charge and weak link as not ready', () => {
    const lowCharge = evaluatePreFlightSeven(
      aTelemetry({ batteryFraction: 0.12 }),
      true,
    )
    expect(lowCharge.find((item) => item.id === 'battery')).toMatchObject({ status: 'fail' })

    const weakLink = evaluatePreFlightSeven(
      aTelemetry({ linkQuality: 0.1, orientation: { pitchDegrees: 0, rollDegrees: 0, yawDegrees: 0 } }),
      true,
    )
    expect(weakLink.find((item) => item.id === 'wifi')).toMatchObject({ status: 'fail' })
  })

  it('is done only when all seven pass including the hand tick', () => {
    const partial = evaluatePreFlightSeven(
      aTelemetry({
        batteryFraction: 0.82,
        orientation: { pitchDegrees: 0, rollDegrees: 0, yawDegrees: 0 },
        camera: { streaming: true },
        proximity: null,
        linkQuality: 0.8,
        extra: { altitudeHold: true },
      }),
      false,
    )
    expect(preFlightSevenDoneCount(partial)).toBe(6)
    expect(isPreFlightSevenDone(partial)).toBe(false)

    const complete = evaluatePreFlightSeven(
      aTelemetry({
        batteryFraction: 0.82,
        orientation: { pitchDegrees: 0, rollDegrees: 0, yawDegrees: 0 },
        camera: { streaming: true },
        proximity: null,
        linkQuality: 0.8,
        extra: { altitudeHold: true },
      }),
      true,
    )
    expect(isPreFlightSevenDone(complete)).toBe(true)
  })

  it('maps every status to a word', () => {
    expect(preFlightSevenStatusWord('pass')).toBe('OK')
    expect(preFlightSevenStatusWord('fail')).toBe('Not ready')
    expect(preFlightSevenStatusWord('unreportable')).toBe('Cannot report')
    expect(preFlightSevenStatusWord('pending')).toBe('Still open')
  })
})

describe('propeller ticks', () => {
  it('persists for the same Lesson and resets for a new one', () => {
    togglePropellersTick('lesson-1', 'ttf-0001')
    expect(propellersTicked(readPreFlightSeven('lesson-1'), 'ttf-0001')).toBe(true)

    expect(readPreFlightSeven('lesson-2')).toEqual(emptyPreFlightSeven('lesson-2'))
    expect(propellersTicked(readPreFlightSeven('lesson-2'), 'ttf-0001')).toBe(false)
  })

  it('toggling twice clears the tick', () => {
    togglePropellersTick('lesson-1', 'ttf-0001')
    togglePropellersTick('lesson-1', 'ttf-0001')
    expect(propellersTicked(readPreFlightSeven('lesson-1'), 'ttf-0001')).toBe(false)
  })

  it('resetPreFlightSeven clears every tick for the Lesson', () => {
    togglePropellersTick('lesson-1', 'ttf-0001')
    resetPreFlightSeven('lesson-1')
    expect(readPreFlightSeven('lesson-1')).toEqual(emptyPreFlightSeven('lesson-1'))
  })
})

/**
 * A pre-flight check on a craft that is not in the room.
 *
 * The check is a Teacher walking a bench with the aircraft in their hands. In a simulation
 * there is no bench: "Motion sensor needs recalibrating" on Drone 4 was a job that could not
 * be done, and every third simulated craft reported no rangefinder, so step 4 could never be
 * finished on it at all. The simulator says on the Telemetry that it is a simulation, which is
 * true down a socket as well — the ordinary classroom launch runs it in the ground station.
 */
describe('pre-flight on a simulated craft', () => {
  const simulated = (over: Parameters<typeof aTelemetry>[0] = {}) =>
    aTelemetry({ ...over, extra: { ...(over.extra ?? {}), simulated: true } })

  it('passes every reading it takes itself, and says why', () => {
    const readings = evaluatePreFlightSeven(
      simulated({ fault: { code: 'IMU', description: 'Motion sensor needs recalibrating' } }),
      true,
    )

    expect(isPreFlightSevenDone(readings)).toBe(true)
    expect(readings.find((item) => item.id === 'sensors')?.detail)
      .toBe('Simulated craft, nothing on a bench to check.')
  })

  /* Every row stays. Six of seven with the seventh missing sends a Teacher hunting. */
  it('keeps all seven rows in the same order', () => {
    const readings = evaluatePreFlightSeven(simulated(), false)

    expect(readings.map((item) => item.id)).toEqual(PRE_FLIGHT_SEVEN_ITEMS.map((i) => i.id))
  })

  /* Propellers is the Teacher's own eyes, and it is the one the tick-all exists for. */
  it('still waits for the propeller tick', () => {
    const readings = evaluatePreFlightSeven(simulated(), false)

    expect(readings.find((item) => item.id === 'propellers')?.status).toBe('pending')
    expect(isPreFlightSevenDone(readings)).toBe(false)
  })

  /* A real aircraft with a real fault is still a real fault. */
  it('changes nothing about a craft that is actually there', () => {
    const readings = evaluatePreFlightSeven(
      aTelemetry({ fault: { code: 'IMU', description: 'Motion sensor needs recalibrating' } }),
      true,
    )

    expect(readings.find((item) => item.id === 'sensors')?.status).toBe('fail')
  })
})
