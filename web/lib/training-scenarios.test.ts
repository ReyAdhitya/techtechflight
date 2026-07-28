import { beforeEach, describe, expect, it } from 'vitest'
import type { DroneRegistration } from '@techtechflight/contract'
import { TestClock } from '@techtechflight/contract/testing'
import { fleetVitals, alertQueue } from './vitals'
import { LocalFleetLink } from './local-fleet-link'
import { TRAINING_SCENARIOS, resetTraining } from './training-scenarios'

/**
 * Named training scenarios — data → Fleet → vitals pins for T1–T5.
 *
 * Lesson/Reports/Side layout still need a Teacher eye (and screenshots); these assert the
 * Telemetry the board reacts to is actually wrong in the way the catalog claims.
 */

const FLEET: readonly DroneRegistration[] = [
  { id: 'ttf-0001', name: 'Drone 1', boardOrder: 1 },
  { id: 'ttf-0002', name: 'Drone 2', boardOrder: 2 },
  { id: 'ttf-0003', name: 'Drone 3', boardOrder: 3 },
]

let clock: TestClock
let link: LocalFleetLink

const build = () =>
  new LocalFleetLink({
    clock,
    registrations: FLEET,
    reportIntervalMs: 1_000,
    random: () => 0.5,
    spontaneous: false,
  })

const run = (id: string) => {
  const entry = TRAINING_SCENARIOS.find((scenario) => scenario.id === id)!
  resetTraining(link.scenarios)
  entry.run(link.scenarios)
  clock.advance(1_000)
}

const vitalsOf = () => {
  const state = link.snapshot.state!
  return fleetVitals({
    state,
    receivedAt: link.snapshot.receivedAt!,
    now: clock.now(),
    batteries: [],
    rates: new Map(),
  })
}

beforeEach(() => {
  clock = new TestClock(1_000_000)
  link = build()
  link.start()
  clock.advance(1_000)
})

describe('training scenarios T1–T5', () => {
  it('T1 puts two Drones inside the separation warning', () => {
    run('T1')
    const state = link.snapshot.state!
    const a = state.drones[0]!.telemetry!
    const b = state.drones[1]!.telemetry!
    const dx = a.position!.eastM - b.position!.eastM
    const dy = a.position!.northM - b.position!.northM
    expect(Math.hypot(dx, dy)).toBeLessThan(1.5)
    expect(alertQueue(vitalsOf()).some((alert) => alert.kind === 'separation')).toBe(true)
  })

  it('T2 flies with a critically low pack', () => {
    run('T2')
    const drone = link.snapshot.state!.drones[0]!
    expect(drone.telemetry?.airborne).toBe(true)
    expect(drone.telemetry?.batteryFraction).toBeLessThan(0.15)
    // Strip charge is the Teacher-visible fact; land-now endurance needs a slope of samples.
  })

  it('T3 takes a Drone offline without reordering the Fleet', () => {
    run('T3')
    // Silence ages to Offline after the ground station's offline threshold (60 s default).
    clock.advance(60_000)
    const ids = link.snapshot.state!.drones.map((drone) => drone.id)
    expect(ids).toEqual(['ttf-0001', 'ttf-0002', 'ttf-0003'])
    expect(link.snapshot.state!.drones[1]!.status).toBe('Offline')
  })

  it('T4 raises Fault on Drone 3 while boardOrder holds', () => {
    run('T4')
    expect(link.snapshot.state!.drones.map((drone) => drone.id)).toEqual([
      'ttf-0001',
      'ttf-0002',
      'ttf-0003',
    ])
    expect(link.snapshot.state!.drones[2]!.status).toBe('Fault')
  })

  it('T5 latches the emergency stop', () => {
    run('T5')
    expect(link.snapshot.state!.drones[0]!.telemetry?.emergencyStopTriggered).toBe(true)
    expect(vitalsOf()[0]!.phase).toBe('emergency')
  })
})
