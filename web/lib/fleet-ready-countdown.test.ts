import { describe, expect, it } from 'vitest'
import { aDroneState } from '@techtechflight/contract/fixtures'
import {
  fleetReadyCountdown,
  formatFleetReadyCountdown,
} from './fleet-ready-countdown'

describe('fleetReadyCountdown', () => {
  it('says nothing when no craft carries an observed-charge forecast', () => {
    expect(
      fleetReadyCountdown([
        aDroneState({ status: 'Ready' }),
        aDroneState({ id: '2', status: 'Not Ready', timeToReadyMs: null }),
        aDroneState({ id: '3', status: 'Offline' }),
      ]),
    ).toBeNull()
  })

  it('counts Ready craft plus forecasted ones at the longest wait', () => {
    const forecast = fleetReadyCountdown([
      aDroneState({ id: 'a', name: 'Drone 1', status: 'Ready' }),
      aDroneState({ id: 'b', name: 'Drone 2', status: 'Ready' }),
      aDroneState({ id: 'c', name: 'Drone 3', status: 'Ready' }),
      aDroneState({ id: 'd', name: 'Drone 4', status: 'Ready' }),
      aDroneState({
        id: 'e',
        name: 'Drone 5',
        status: 'Not Ready',
        timeToReadyMs: 8 * 60_000,
      }),
      aDroneState({
        id: 'f',
        name: 'Drone 6',
        status: 'Not Ready',
        timeToReadyMs: 12 * 60_000,
      }),
    ])
    expect(forecast).toEqual({ readyCount: 6, minutes: 12 })
    expect(formatFleetReadyCountdown(forecast!)).toBe('6 ready in 12 minutes')
  })

  it('rounds like a single tile and never promises under a minute', () => {
    expect(
      fleetReadyCountdown([
        aDroneState({ status: 'Not Ready', timeToReadyMs: 20_000 }),
      ]),
    ).toEqual({ readyCount: 1, minutes: 1 })
    expect(
      formatFleetReadyCountdown({ readyCount: 1, minutes: 1 }),
    ).toBe('1 ready in 1 minute')
  })

  it('ignores Offline and fault craft that have no forecast', () => {
    const forecast = fleetReadyCountdown([
      aDroneState({ id: '1', status: 'Ready' }),
      aDroneState({ id: '2', status: 'Fault', timeToReadyMs: null }),
      aDroneState({ id: '3', status: 'Offline', timeToReadyMs: null }),
      aDroneState({
        id: '4',
        status: 'Not Ready',
        timeToReadyMs: 5 * 60_000,
      }),
    ])
    expect(forecast).toEqual({ readyCount: 2, minutes: 5 })
  })
})
