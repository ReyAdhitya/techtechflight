import { describe, expect, it } from 'vitest'
import { classAverageStats } from './class-average'
import type { DroneVitals } from './vitals'

function vitals(partial: Partial<DroneVitals> & Pick<DroneVitals, 'droneId'>): DroneVitals {
  return {
    callsign: partial.callsign ?? partial.droneId,
    status: partial.status ?? 'Ready',
    phase: partial.phase ?? 'on-ground',
    airborne: partial.airborne ?? false,
    altitudeM: partial.altitudeM ?? null,
    verticalRateMps: partial.verticalRateMps ?? null,
    groundSpeedMps: partial.groundSpeedMps ?? null,
    batteryFraction: partial.batteryFraction ?? 1,
    enduranceMs: partial.enduranceMs ?? null,
    responseAgeMs: partial.responseAgeMs ?? 100,
    position: partial.position ?? null,
    separationM: partial.separationM ?? null,
    conflictWith: partial.conflictWith ?? null,
    alerts: partial.alerts ?? [],
    ...partial,
  }
}

describe('classAverageStats', () => {
  it('averages airborne heights and readiness share', () => {
    const result = classAverageStats([
      vitals({ droneId: 'a', airborne: true, altitudeM: 2, phase: 'level' }),
      vitals({ droneId: 'b', airborne: true, altitudeM: 4, phase: 'level' }),
      vitals({ droneId: 'c', airborne: false, altitudeM: 0, status: 'Ready' }),
      vitals({ droneId: 'd', status: 'Not Ready' }),
    ])

    expect(result.meanHeightM).toBe(3)
    // a, b default Ready; c is Ready; only d is Not Ready
    expect(result.readyCount).toBe(3)
    expect(result.total).toBe(4)
  })

  it('returns null mean height when nothing is airborne with altitude', () => {
    const result = classAverageStats([
      vitals({ droneId: 'a', airborne: false, status: 'Ready' }),
    ])

    expect(result.meanHeightM).toBeNull()
    expect(result.readyCount).toBe(1)
  })
})
