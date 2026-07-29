import { beforeEach, describe, expect, it } from 'vitest'
import { isCommandable, type TelemetryObservation } from '@techtechflight/contract'
import { TestClock } from '@techtechflight/contract/testing'
import { CLASSROOM_FLEET } from './classroom-fleet.ts'
import { SimulatedTelemetrySource } from './simulated-telemetry-source.ts'
import { GroundStation } from '../fleet.ts'

/**
 * The simulator ships, so it is tested like a shipped thing. `spontaneous: false` pins
 * the Fleet so these assert simulator mechanics rather than a dice roll.
 */

let clock: TestClock
let simulator: SimulatedTelemetrySource
let observed: TelemetryObservation[]

const REPORT_INTERVAL = 1_000

const latestFor = (droneId: string) =>
  [...observed].reverse().find((observation) => observation.droneId === droneId)

beforeEach(() => {
  clock = new TestClock(1_000_000)
  simulator = new SimulatedTelemetrySource({
    registrations: CLASSROOM_FLEET,
    clock,
    reportIntervalMs: REPORT_INTERVAL,
    random: () => 0.5,
    spontaneous: false,
  })
  observed = []
  simulator.onObservation((observation) => observed.push(observation))
  simulator.connect()
})

describe('reporting', () => {
  it('reports every Drone it simulates on each interval', () => {
    clock.advance(REPORT_INTERVAL)

    expect(observed.map((observation) => observation.droneId)).toEqual(
      CLASSROOM_FLEET.map((registration) => registration.id),
    )
  })

  it('reports battery as a proportion between nothing and full', () => {
    clock.advance(REPORT_INTERVAL)

    for (const observation of observed) {
      expect(observation.telemetry.batteryFraction).toBeGreaterThanOrEqual(0)
      expect(observation.telemetry.batteryFraction).toBeLessThanOrEqual(1)
    }
  })

  it('marks the Drones whose charge is only an estimate', () => {
    clock.advance(REPORT_INTERVAL)

    const estimates = observed.filter(
      (observation) => observation.telemetry.batteryIsEstimate,
    )
    expect(estimates.length).toBeGreaterThan(0)
    expect(estimates.length).toBeLessThan(observed.length)
  })

  it('reports whatever else the aircraft can sense, for the detail view', () => {
    clock.advance(REPORT_INTERVAL)

    expect(latestFor('ttf-0001')?.telemetry.extra).toMatchObject({
      firmware: expect.any(String),
      satellitesVisible: expect.any(Number),
    })
  })

  it('stops reporting once disconnected', () => {
    clock.advance(REPORT_INTERVAL)
    const countWhileConnected = observed.length

    simulator.disconnect()
    clock.advance(REPORT_INTERVAL * 10)

    expect(observed).toHaveLength(countWhileConnected)
  })
})

describe('batteries draining', () => {
  it('drains a resting Drone slowly', () => {
    clock.advance(REPORT_INTERVAL)
    const first = latestFor('ttf-0001')!.telemetry.batteryFraction

    clock.advance(60_000)
    const later = latestFor('ttf-0001')!.telemetry.batteryFraction

    expect(later).toBeLessThan(first)
    expect(first - later).toBeCloseTo(0.004, 3)
  })

  it('drains a Flying Drone faster than a resting one', () => {
    clock.advance(REPORT_INTERVAL)
    const restingBefore = latestFor('ttf-0001')!.telemetry.batteryFraction
    const flyingBefore = latestFor('ttf-0002')!.telemetry.batteryFraction

    simulator.takeOff('ttf-0002')
    clock.advance(60_000)

    const restingDrain = restingBefore - latestFor('ttf-0001')!.telemetry.batteryFraction
    const flyingDrain = flyingBefore - latestFor('ttf-0002')!.telemetry.batteryFraction

    expect(flyingDrain).toBeGreaterThan(restingDrain)
  })

  it('brings a Flying Drone down when its battery runs out', () => {
    simulator.takeOff('ttf-0001')
    simulator.setBattery('ttf-0001', 0.06)
    clock.advance(REPORT_INTERVAL)
    expect(latestFor('ttf-0001')?.telemetry.airborne).toBe(true)

    // Long enough for a 6%-per-minute drain to eat the remaining charge.
    clock.advance(60_000)

    expect(latestFor('ttf-0001')?.telemetry.airborne).toBe(false)
  })

  it('never reports a battery below empty', () => {
    simulator.setBattery('ttf-0001', 0.001)
    clock.advance(600_000)

    expect(latestFor('ttf-0001')!.telemetry.batteryFraction).toBe(0)
  })
})

describe('batteries charging', () => {
  /*
   * Without this the only direction a battery could ever move was down, and a long
   * demonstration ended with a Fleet of flat Drones and no way back. It is also what the
   * time-to-Ready forecast is developed against — a forecast is only worth anything if
   * the thing it extrapolates from climbs the way a real pack does.
   */

  it('brings a plugged-in Drone back up rather than only ever down', () => {
    simulator.setBattery('ttf-0001', 0.1)
    simulator.plugIn('ttf-0001')
    clock.advance(REPORT_INTERVAL)
    const first = latestFor('ttf-0001')!.telemetry.batteryFraction

    clock.advance(60_000)
    const later = latestFor('ttf-0001')!.telemetry.batteryFraction

    expect(later).toBeGreaterThan(first)
    expect(later - first).toBeCloseTo(0.03, 3)
  })

  it('stops once the pack is full, the way a charger tapers off', () => {
    simulator.setBattery('ttf-0001', 0.97)
    simulator.plugIn('ttf-0001')
    clock.advance(120_000)
    const full = latestFor('ttf-0001')!.telemetry.batteryFraction

    clock.advance(120_000)
    const later = latestFor('ttf-0001')!.telemetry.batteryFraction

    expect(full).toBeLessThanOrEqual(1)
    // Draining again, which is only possible if charging stopped.
    expect(later).toBeLessThan(full)
  })

  it('goes back to draining once unplugged', () => {
    simulator.setBattery('ttf-0001', 0.2)
    simulator.plugIn('ttf-0001')
    clock.advance(60_000)
    simulator.unplug('ttf-0001')
    clock.advance(REPORT_INTERVAL)
    const unplugged = latestFor('ttf-0001')!.telemetry.batteryFraction

    clock.advance(60_000)

    expect(latestFor('ttf-0001')!.telemetry.batteryFraction).toBeLessThan(unplugged)
  })

  it('refuses to charge a Drone that is in the air', () => {
    simulator.setBattery('ttf-0001', 0.5)
    simulator.takeOff('ttf-0001')
    simulator.plugIn('ttf-0001')
    clock.advance(REPORT_INTERVAL)
    const first = latestFor('ttf-0001')!.telemetry.batteryFraction

    clock.advance(60_000)

    expect(latestFor('ttf-0001')!.telemetry.batteryFraction).toBeLessThan(first)
  })

  it('takes a Drone off the charger when it takes off', () => {
    simulator.setBattery('ttf-0001', 0.5)
    simulator.plugIn('ttf-0001')
    clock.advance(REPORT_INTERVAL)

    simulator.takeOff('ttf-0001')
    const beforeFlight = latestFor('ttf-0001')!.telemetry.batteryFraction
    clock.advance(60_000)

    expect(latestFor('ttf-0001')!.telemetry.batteryFraction).toBeLessThan(beforeFlight)
  })
})

describe('scenarios a demonstration needs on demand', () => {
  it('falls silent when a Drone loses its link, rather than reporting its silence', () => {
    clock.advance(REPORT_INTERVAL)
    simulator.loseLink('ttf-0001')
    observed = []

    clock.advance(REPORT_INTERVAL * 5)

    expect(latestFor('ttf-0001')).toBeUndefined()
    expect(latestFor('ttf-0002')).toBeDefined()
  })

  it('resumes reporting when the link comes back', () => {
    simulator.loseLink('ttf-0001')
    clock.advance(REPORT_INTERVAL * 3)
    simulator.restoreLink('ttf-0001')
    observed = []

    clock.advance(REPORT_INTERVAL)

    expect(latestFor('ttf-0001')).toBeDefined()
  })

  it('reports a fault on demand, and clears it again', () => {
    simulator.injectFault('ttf-0001')
    clock.advance(REPORT_INTERVAL)
    expect(latestFor('ttf-0001')?.telemetry.fault).toMatchObject({
      code: 'IMU_CALIBRATION',
    })

    simulator.clearFault('ttf-0001')
    clock.advance(REPORT_INTERVAL)

    expect(latestFor('ttf-0001')?.telemetry.fault).toBeNull()
  })

  it('starts and stops the camera stream flag without inventing a URL', () => {
    // Every classroom sim craft is fitted (#91); Telemetry carries only streaming.
    clock.advance(REPORT_INTERVAL)
    expect(latestFor('ttf-0001')?.telemetry.camera).toEqual({ streaming: false })
    expect(latestFor('ttf-0001')?.telemetry).not.toHaveProperty('camera.url')

    simulator.startCamera('ttf-0001')
    clock.advance(REPORT_INTERVAL)
    expect(latestFor('ttf-0001')?.telemetry.camera).toEqual({ streaming: true })
    expect(Object.keys(latestFor('ttf-0001')!.telemetry.camera!)).toEqual(['streaming'])

    simulator.stopCamera('ttf-0001')
    clock.advance(REPORT_INTERVAL)
    expect(latestFor('ttf-0001')?.telemetry.camera).toEqual({ streaming: false })
  })

  it('fits a camera on every classroom sim Drone, including odd board positions', () => {
    clock.advance(REPORT_INTERVAL)
    for (const id of ['ttf-0001', 'ttf-0002', 'ttf-0003', 'ttf-0004', 'ttf-0005', 'ttf-0006']) {
      expect(latestFor(id)?.telemetry.camera).toEqual({ streaming: false })
    }
  })

  it('takes off and lands on demand', () => {
    simulator.takeOff('ttf-0001')
    clock.advance(REPORT_INTERVAL)
    expect(latestFor('ttf-0001')?.telemetry.airborne).toBe(true)

    simulator.land('ttf-0001')
    clock.advance(REPORT_INTERVAL)

    expect(latestFor('ttf-0001')?.telemetry.airborne).toBe(false)
  })

  it('refuses to act on a Drone it does not simulate', () => {
    expect(() => simulator.injectFault('ttf-9999')).toThrow(/ttf-9999/)
  })
})

describe('driving the real ground station', () => {
  it('produces a Fleet the ground station can derive every Status from', () => {
    const station = new GroundStation({
      registrations: CLASSROOM_FLEET,
      source: simulator,
      clock,
      thresholds: {
        staleAfterMs: 10_000,
        offlineAfterMs: 60_000,
        usableBatteryFraction: 0.3,
      },
    })
    station.start()

    simulator.setBattery('ttf-0001', 0.9)
    simulator.setBattery('ttf-0002', 0.1)
    simulator.injectFault('ttf-0003')
    simulator.takeOff('ttf-0004')
    simulator.loseLink('ttf-0005')

    clock.advance(REPORT_INTERVAL)
    const byName = new Map(
      station.fleetState().drones.map((drone) => [drone.name, drone.status]),
    )

    expect(byName.get('Drone 1')).toBe('Ready')
    expect(byName.get('Drone 2')).toBe('Not Ready')
    expect(byName.get('Drone 3')).toBe('Fault')
    expect(byName.get('Drone 4')).toBe('Flying')

    clock.advance(60_000)
    expect(
      station.fleetState().drones.find((drone) => drone.name === 'Drone 5')?.status,
    ).toBe('Offline')
  })
})

/**
 * Commands, which are what a Teacher asks of an aircraft.
 *
 * Every one of these takes energy out of the Drone. The absence worth noticing is
 * take-off: there is no Command that makes a Drone do more than it is already doing, so
 * the worst outcome of a mistaken one is an aircraft that comes down when it need not
 * have.
 */
describe('being asked to do something', () => {
  const asked = (droneId: string, kind: 'land' | 'hold' | 'auto-land' | 'emergency-stop') => ({
    id: `c-${kind}`,
    droneId,
    kind,
    issuedAt: 1,
  })

  it('is recognised as a Fleet that accepts Commands at all', () => {
    expect(isCommandable(simulator)).toBe(true)
  })

  it('brings a Drone down when asked to land', () => {
    simulator.takeOff('ttf-0001')
    clock.advance(3_000)
    expect(latestFor('ttf-0001')?.telemetry?.airborne).toBe(true)

    simulator.command(asked('ttf-0001', 'land'))
    clock.advance(6_000)

    expect(latestFor('ttf-0001')?.telemetry?.airborne).toBe(false)
    expect(latestFor('ttf-0001')?.telemetry?.altitudeM).toBe(0)
  })

  it('stops a climb where it is when asked to hold', () => {
    simulator.takeOff('ttf-0001')
    clock.advance(1_000)
    const partway = latestFor('ttf-0001')?.telemetry?.altitudeM ?? 0

    simulator.command(asked('ttf-0001', 'hold'))
    clock.advance(5_000)

    // Still up, and no higher than it was told to stop at.
    expect(latestFor('ttf-0001')?.telemetry?.airborne).toBe(true)
    expect(latestFor('ttf-0001')?.telemetry?.altitudeM).toBeCloseTo(partway, 1)
  })

  it('leaves a Drone on the ground alone when asked to hold', () => {
    simulator.command(asked('ttf-0002', 'hold'))
    clock.advance(2_000)

    expect(latestFor('ttf-0002')?.telemetry?.airborne).toBe(false)
  })

  it('latches the emergency stop, which stays latched', () => {
    simulator.takeOff('ttf-0001')
    clock.advance(2_000)

    simulator.command(asked('ttf-0001', 'emergency-stop'))
    clock.advance(10_000)

    // Sticky on purpose: the physical thing it models is a button someone has to walk
    // over and release, and a cut that cleared itself would let a Drone rejoin a lesson.
    expect(latestFor('ttf-0001')?.telemetry?.emergencyStopTriggered).toBe(true)
    expect(latestFor('ttf-0001')?.telemetry?.airborne).toBe(false)
  })

  it('ignores a Command for a Drone this Fleet does not have', () => {
    expect(() => simulator.command(asked('ttf-9999', 'land'))).not.toThrow()
  })
})
