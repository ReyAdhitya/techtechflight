import { describe, expect, it } from 'vitest'
import {
  aDroneState,
  aFleetState,
  aTelemetry,
} from '@techtechflight/contract/fixtures'
import type { DroneState } from '@techtechflight/contract'
import { fleetVitals, GroundSpeedTracker, type VitalsInput } from './vitals'

const NOW = 1_000_000

function flying(overrides: Partial<DroneState> = {}): DroneState {
  return aDroneState({
    status: 'Flying',
    lastContact: NOW,
    telemetry: aTelemetry({
      airborne: true,
      altitudeM: 2,
      position: { eastM: 0, northM: 0 },
      ...(overrides.telemetry ?? {}),
    }),
    ...overrides,
  })
}

function input(state: ReturnType<typeof aFleetState>, extra: Partial<VitalsInput> = {}): VitalsInput {
  return {
    state,
    receivedAt: state.generatedAt,
    now: state.generatedAt,
    batteries: [],
    rates: new Map(),
    ...extra,
  }
}

describe('the ground speed tracker', () => {
  it('gives no speed from a single reading', () => {
    const tracker = new GroundSpeedTracker()
    tracker.observe(
      aFleetState(
        [flying({ lastContact: 1_000, telemetry: aTelemetry({ airborne: true, position: { eastM: 0, northM: 0 } }) })],
        1_000,
      ),
    )
    expect(tracker.speeds().get('drone-1')).toBeNull()
  })

  it('measures displacement over time in metres per second', () => {
    const tracker = new GroundSpeedTracker()
    tracker.observe(
      aFleetState(
        [flying({ lastContact: 1_000, telemetry: aTelemetry({ airborne: true, position: { eastM: 0, northM: 0 } }) })],
        1_000,
      ),
    )
    tracker.observe(
      aFleetState(
        [flying({ lastContact: 3_000, telemetry: aTelemetry({ airborne: true, position: { eastM: 4, northM: 3 } }) })],
        3_000,
      ),
    )
    // 5 m over 2 s → 2.5 m/s
    expect(tracker.speeds().get('drone-1')).toBeCloseTo(2.5)
  })

  it('ignores a repeat of the same contact moment, which carries no new time', () => {
    const tracker = new GroundSpeedTracker()
    const snapshot = aFleetState(
      [flying({ lastContact: 1_000, telemetry: aTelemetry({ airborne: true, position: { eastM: 0, northM: 0 } }) })],
      1_000,
    )
    tracker.observe(snapshot)
    tracker.observe(snapshot)
    tracker.observe(snapshot)
    expect(tracker.speeds().get('drone-1')).toBeNull()
  })

  it('does not track an airframe that cannot report position', () => {
    const tracker = new GroundSpeedTracker()
    tracker.observe(
      aFleetState([aDroneState({ lastContact: 1_000, telemetry: aTelemetry({ airborne: true }) })], 1_000),
    )
    expect(tracker.speeds().has('drone-1')).toBe(false)
  })

  it('does not track an offline airframe with no position', () => {
    const tracker = new GroundSpeedTracker()
    tracker.observe(
      aFleetState([aDroneState({ status: 'Offline', lastContact: null, telemetry: null })], NOW),
    )
    expect(tracker.speeds().has('drone-1')).toBe(false)
  })
})

describe('ground speed on vitals', () => {
  it('carries null when no ground speed map is supplied', () => {
    const vitals = fleetVitals(input(aFleetState([flying()], NOW)))[0]!
    expect(vitals.groundSpeedMps).toBeNull()
  })

  it('carries the supplied ground speed for each Drone', () => {
    const drone = flying()
    const vitals = fleetVitals(
      input(aFleetState([drone], NOW), { groundSpeeds: new Map([[drone.id, 1.25]]) }),
    )[0]!
    expect(vitals.groundSpeedMps).toBeCloseTo(1.25)
  })
})
