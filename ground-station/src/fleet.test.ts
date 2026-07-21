import { beforeEach, describe, expect, it } from 'vitest'
import type { DroneRegistration, FleetState, FleetThresholds } from '@techtechflight/contract'
import { TestClock } from '@techtechflight/contract/testing'
import { aDroneState } from '@techtechflight/contract/fixtures'
import { GroundStation } from './fleet.ts'
import { FakeTelemetrySource } from './testing.ts'

/**
 * Seam 1. Driven entirely through Telemetry Source and Clock, observed entirely
 * through emitted Fleet State. No sockets, no HTTP, no React, and never a sleep.
 */

const THRESHOLDS: FleetThresholds = {
  staleAfterMs: 10_000,
  offlineAfterMs: 60_000,
  usableBatteryFraction: 0.3,
}

const FLEET: readonly DroneRegistration[] = [
  { id: 'ttf-0001', name: 'Drone 1', boardOrder: 1 },
  { id: 'ttf-0002', name: 'Drone 2', boardOrder: 2 },
  { id: 'ttf-0003', name: 'Drone 3', boardOrder: 3 },
]

let clock: TestClock
let source: FakeTelemetrySource
let station: GroundStation

const droneNamed = (state: FleetState, name: string) => {
  const drone = state.drones.find((candidate) => candidate.name === name)
  if (!drone) throw new Error(`No Drone named ${name} in Fleet State`)
  return drone
}

beforeEach(() => {
  clock = new TestClock(1_000_000)
  source = new FakeTelemetrySource()
  station = new GroundStation({
    registrations: FLEET,
    source,
    clock,
    thresholds: THRESHOLDS,
  })
  station.start()
})

describe('the Fleet a Teacher owns', () => {
  it('shows every Drone the School owns, not only the ones switched on', () => {
    expect(station.fleetState().drones.map((drone) => drone.name)).toEqual([
      'Drone 1',
      'Drone 2',
      'Drone 3',
    ])
  })

  it('connects the Telemetry Source on start', () => {
    expect(source.connected).toBe(true)
  })

  it('keeps each Drone in its place regardless of what happens to it', () => {
    source.report('ttf-0003', { batteryFraction: 0.9 })
    source.report('ttf-0001', { fault: { code: 'X', description: 'Broken' } })

    expect(station.fleetState().drones.map((drone) => drone.name)).toEqual([
      'Drone 1',
      'Drone 2',
      'Drone 3',
    ])
  })
})

describe('deriving Status', () => {
  it('reports a Drone in contact with charge and no fault as Ready', () => {
    source.report('ttf-0001', { batteryFraction: 0.8 })

    expect(droneNamed(station.fleetState(), 'Drone 1').status).toBe('Ready')
  })

  it('reports a Drone below the usable battery threshold as Not Ready', () => {
    source.report('ttf-0001', { batteryFraction: 0.29 })

    expect(droneNamed(station.fleetState(), 'Drone 1').status).toBe('Not Ready')
  })

  it('treats battery exactly at the threshold as enough to fly', () => {
    source.report('ttf-0001', { batteryFraction: 0.3 })

    expect(droneNamed(station.fleetState(), 'Drone 1').status).toBe('Ready')
  })

  it('reports a Drone reporting a fault as Fault', () => {
    source.report('ttf-0001', {
      batteryFraction: 0.9,
      fault: { code: 'IMU_CALIBRATION', description: 'Motion sensor needs recalibrating' },
    })

    expect(droneNamed(station.fleetState(), 'Drone 1').status).toBe('Fault')
  })

  it('reports an airborne Drone as Flying', () => {
    source.report('ttf-0001', { airborne: true, batteryFraction: 0.7 })

    expect(droneNamed(station.fleetState(), 'Drone 1').status).toBe('Flying')
  })

  it('reports an airborne Drone as Flying even on low battery', () => {
    source.report('ttf-0001', { airborne: true, batteryFraction: 0.05 })

    expect(droneNamed(station.fleetState(), 'Drone 1').status).toBe('Flying')
  })
})

describe('never heard from, versus not heard from recently', () => {
  it('shows a Drone that has never reported as Offline with no Last Contact', () => {
    const drone = droneNamed(station.fleetState(), 'Drone 2')

    expect(drone.status).toBe('Offline')
    expect(drone.lastContact).toBeNull()
    expect(drone.telemetry).toBeNull()
  })

  it('does not mark a never-heard-from Drone as Stale, because there is nothing to age', () => {
    clock.advance(500_000)

    expect(droneNamed(station.fleetState(), 'Drone 2').stale).toBe(false)
  })

  it('keeps a Drone that has fallen silent distinguishable from one never heard from', () => {
    source.report('ttf-0001', { batteryFraction: 0.8 })
    clock.advance(THRESHOLDS.offlineAfterMs + 1_000)

    const silent = droneNamed(station.fleetState(), 'Drone 1')
    const neverHeard = droneNamed(station.fleetState(), 'Drone 2')

    expect(silent.status).toBe('Offline')
    expect(neverHeard.status).toBe('Offline')
    expect(silent.lastContact).not.toBeNull()
    expect(neverHeard.lastContact).toBeNull()
  })
})

describe('Telemetry ageing into Stale, and then the Drone into Offline', () => {
  beforeEach(() => {
    source.report('ttf-0001', { batteryFraction: 0.8 })
  })

  it('treats fresh Telemetry as current', () => {
    expect(droneNamed(station.fleetState(), 'Drone 1').stale).toBe(false)
  })

  it('marks Telemetry Stale after the stale threshold without changing Status', () => {
    clock.advance(THRESHOLDS.staleAfterMs)

    const drone = droneNamed(station.fleetState(), 'Drone 1')
    expect(drone.stale).toBe(true)
    expect(drone.status).toBe('Ready')
  })

  it('keeps showing the last known values once Stale', () => {
    clock.advance(THRESHOLDS.staleAfterMs + 1)

    expect(droneNamed(station.fleetState(), 'Drone 1').telemetry?.batteryFraction).toBe(0.8)
  })

  it('turns the Drone Offline after the longer offline threshold', () => {
    clock.advance(THRESHOLDS.offlineAfterMs)

    expect(droneNamed(station.fleetState(), 'Drone 1').status).toBe('Offline')
  })

  it('retains last known Telemetry and Last Contact while Offline', () => {
    const heardAt = clock.now()
    clock.advance(THRESHOLDS.offlineAfterMs + 30_000)

    const drone = droneNamed(station.fleetState(), 'Drone 1')
    expect(drone.status).toBe('Offline')
    expect(drone.telemetry?.batteryFraction).toBe(0.8)
    expect(drone.lastContact).toBe(heardAt)
  })

  it('returns the Drone to its correct Status as soon as it is heard from again', () => {
    clock.advance(THRESHOLDS.offlineAfterMs + 30_000)
    expect(droneNamed(station.fleetState(), 'Drone 1').status).toBe('Offline')

    source.report('ttf-0001', { batteryFraction: 0.75 })

    const drone = droneNamed(station.fleetState(), 'Drone 1')
    expect(drone.status).toBe('Ready')
    expect(drone.stale).toBe(false)
    expect(drone.lastContact).toBe(clock.now())
  })

  it('ages a Drone that goes quiet mid-flight out of Flying', () => {
    source.report('ttf-0001', { airborne: true, batteryFraction: 0.6 })
    expect(droneNamed(station.fleetState(), 'Drone 1').status).toBe('Flying')

    clock.advance(THRESHOLDS.offlineAfterMs)

    expect(droneNamed(station.fleetState(), 'Drone 1').status).toBe('Offline')
  })
})

describe('telling the dashboard about it', () => {
  it('emits Fleet State when a Drone is first heard from', () => {
    const emitted: FleetState[] = []
    station.onFleetState((state) => emitted.push(state))

    source.report('ttf-0001', { batteryFraction: 0.8 })

    expect(emitted).toHaveLength(1)
    expect(droneNamed(emitted[0]!, 'Drone 1').status).toBe('Ready')
  })

  it('emits when silence turns a Drone Offline, with no new observation', () => {
    source.report('ttf-0001', { batteryFraction: 0.8 })
    const emitted: FleetState[] = []
    station.onFleetState((state) => emitted.push(state))

    clock.advance(THRESHOLDS.offlineAfterMs + 1_000)

    expect(emitted.at(-1)).toBeDefined()
    expect(droneNamed(emitted.at(-1)!, 'Drone 1').status).toBe('Offline')
  })

  it('stays quiet when nothing about the Fleet has changed', () => {
    source.report('ttf-0001', { batteryFraction: 0.8 })
    const emitted: FleetState[] = []
    station.onFleetState((state) => emitted.push(state))

    clock.advance(THRESHOLDS.staleAfterMs - 1)

    expect(emitted).toEqual([])
  })

  it('produces Drone States shaped like the fixtures the dashboard is tested against', () => {
    // The shared fixture is the contract between the halves. If the ground station
    // grows a field the fixture does not have — or loses one it does — this fails here
    // rather than letting the dashboard drift quietly out of step.
    source.report('ttf-0001', { batteryFraction: 0.8 })

    const derived = droneNamed(station.fleetState(), 'Drone 1')

    expect(Object.keys(derived).sort()).toEqual(Object.keys(aDroneState()).sort())
  })

  it('stamps every snapshot with the ground station clock', () => {
    source.report('ttf-0001', { batteryFraction: 0.8 })

    expect(station.fleetState().generatedAt).toBe(clock.now())
  })

  it('stops emitting once stopped', () => {
    const emitted: FleetState[] = []
    station.onFleetState((state) => emitted.push(state))
    station.stop()

    source.report('ttf-0001', { batteryFraction: 0.8 })
    clock.advance(THRESHOLDS.offlineAfterMs * 2)

    expect(emitted).toEqual([])
    expect(source.connected).toBe(false)
  })
})

describe('Drones the Fleet does not know about', () => {
  it('ignores Telemetry from an unregistered Drone rather than inventing a tile', () => {
    source.report('ttf-9999', { batteryFraction: 0.8 })

    expect(station.fleetState().drones).toHaveLength(3)
  })
})
