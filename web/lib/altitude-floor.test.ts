import { afterEach, describe, expect, it } from 'vitest'
import type { DroneVitals } from '@/lib/vitals'
import {
  ALTITUDE_FLOOR_KEY,
  DEFAULT_ALTITUDE_FLOOR_M,
  dronesBelowAltitudeFloor,
  isBelowAltitudeFloor,
  readAltitudeFloorM,
  writeAltitudeFloorM,
} from './altitude-floor'

const vitals = (
  partial: Partial<DroneVitals> & Pick<DroneVitals, 'droneId' | 'callsign'>,
): DroneVitals =>
  ({
    status: 'Flying',
    phase: 'flying',
    airborne: true,
    altitudeM: 1,
    verticalRateMps: 0,
  groundSpeedMps: null,
    batteryFraction: 0.8,
    enduranceMs: 60_000,
    responseAgeMs: 0,
    position: null,
    separationM: null,
    conflictWith: null,
    alerts: [],
    ...partial,
  }) as DroneVitals

afterEach(() => {
  window.localStorage.removeItem(ALTITUDE_FLOOR_KEY)
})

describe('altitude floor over the desks', () => {
  it('defaults to half a metre — the classroom teaching floor', () => {
    expect(DEFAULT_ALTITUDE_FLOOR_M).toBe(0.5)
    expect(readAltitudeFloorM()).toBe(0.5)
  })

  it('warns only when airborne and below the floor', () => {
    expect(
      isBelowAltitudeFloor(vitals({ droneId: 'a', callsign: 'Drone 1', altitudeM: 0.3 })),
    ).toBe(true)
    expect(
      isBelowAltitudeFloor(vitals({ droneId: 'a', callsign: 'Drone 1', altitudeM: 0.5 })),
    ).toBe(false)
    expect(
      isBelowAltitudeFloor(
        vitals({ droneId: 'a', callsign: 'Drone 1', airborne: false, altitudeM: 0.1 }),
      ),
    ).toBe(false)
    expect(
      isBelowAltitudeFloor(vitals({ droneId: 'a', callsign: 'Drone 1', altitudeM: null })),
    ).toBe(false)
  })

  it('honours a configured floor above the default', () => {
    expect(
      isBelowAltitudeFloor(
        vitals({ droneId: 'a', callsign: 'Drone 1', altitudeM: 0.8 }),
        1,
      ),
    ).toBe(true)
  })

  it('remembers a Teacher-tuned floor in localStorage', () => {
    writeAltitudeFloorM(1.2)
    expect(readAltitudeFloorM()).toBe(1.2)
    expect(window.localStorage.getItem(ALTITUDE_FLOOR_KEY)).toBe('1.2')
  })

  it('ignores nonsense storage and falls back to the default', () => {
    window.localStorage.setItem(ALTITUDE_FLOOR_KEY, 'nope')
    expect(readAltitudeFloorM()).toBe(DEFAULT_ALTITUDE_FLOOR_M)
  })

  it('lists every craft skimming the desks, in board order', () => {
    const below = dronesBelowAltitudeFloor([
      vitals({ droneId: 'a', callsign: 'Drone 1', altitudeM: 0.2 }),
      vitals({ droneId: 'b', callsign: 'Drone 2', altitudeM: 1.5 }),
      vitals({ droneId: 'c', callsign: 'Drone 3', airborne: false, altitudeM: 0 }),
    ])
    expect(below.map((entry) => entry.callsign)).toEqual(['Drone 1'])
  })
})
