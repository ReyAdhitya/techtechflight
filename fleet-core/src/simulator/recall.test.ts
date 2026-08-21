import { beforeEach, describe, expect, it } from 'vitest'
import type { TelemetryObservation } from '@techtechflight/contract'
import { TestClock } from '@techtechflight/contract/testing'
import { CLASSROOM_FLEET } from './classroom-fleet.ts'
import { SimulatedTelemetrySource } from './simulated-telemetry-source.ts'

/**
 * Recall, the one Command that moves an aircraft (ADR-0022).
 *
 * The behaviour these pin is not "the Drone ends up at home" — that would pass on an
 * implementation that teleported it, which is the implementation ADR-0011 forbids. What is
 * pinned is that the journey is *visible*: it takes time, it happens in the Telemetry, and
 * a Drone that is on its way home is still reporting itself as flying. That is what lets a
 * Teacher tell a Drone that obeyed from one that did not.
 */

const REPORT_INTERVAL = 1_000
const DRONE = 'ttf-0001'

let clock: TestClock
let simulator: SimulatedTelemetrySource
let observed: TelemetryObservation[]

const latest = () => [...observed].reverse().find((o) => o.droneId === DRONE)?.telemetry

/** Advance the world by whole report intervals. */
function tick(times = 1) {
  for (let i = 0; i < times; i += 1) clock.advance(REPORT_INTERVAL)
}

beforeEach(() => {
  clock = new TestClock(1_000_000)
  simulator = new SimulatedTelemetrySource({
    registrations: CLASSROOM_FLEET,
    clock,
    reportIntervalMs: REPORT_INTERVAL,
    // Pinned: these assert mechanics, not a dice roll.
    random: () => 0.5,
    spontaneous: false,
  })
  observed = []
  simulator.onObservation((observation) => observed.push(observation))
  simulator.connect()
})

describe('recalling a Drone', () => {
  beforeEach(() => {
    simulator.takeOff(DRONE)
    simulator.setAltitude(DRONE, 2)
    // Put it well away from the bench so the journey home is worth watching.
    simulator.setPosition(DRONE, 6, 2)
    tick()
  })

  it('does not put it on the ground the moment the Command is sent', () => {
    /*
     * The whole of ADR-0011's "a Command is a request, never a fact" in one assertion. If
     * this ever passes with `airborne: false` on the first tick, the simulator has started
     * lying about what the aircraft did.
     */
    simulator.command({ id: 'c1', droneId: DRONE, kind: 'return-home', issuedAt: clock.now() })
    tick()

    expect(latest()?.airborne).toBe(true)
    expect(latest()?.altitudeM).toBeGreaterThan(0)
  })

  it('closes the distance to its take-off point a little at a time', () => {
    simulator.command({ id: 'c1', droneId: DRONE, kind: 'return-home', issuedAt: clock.now() })

    tick()
    const first = latest()?.position
    tick()
    const second = latest()?.position

    const distance = (p?: { eastM: number; northM: number }) =>
      p ? Math.hypot(p.eastM, p.northM) : Number.NaN

    // Drone 1's home is the west end of the bench, centred on the classroom origin.
    expect(distance(second)).toBeLessThan(distance(first))
    expect(distance(second)).toBeGreaterThan(0)
  })

  it('holds its height until it is over home, then comes down', () => {
    simulator.command({ id: 'c1', droneId: DRONE, kind: 'return-home', issuedAt: clock.now() })

    // Mid-journey it is still up. Descending over the room it is crossing would be worse
    // than the situation the Recall was pressed to fix.
    tick(3)
    expect(latest()?.altitudeM).toBeGreaterThan(1)

    // Long enough to cross the room at 0.6 m/s and then descend from two metres.
    tick(30)
    expect(latest()?.altitudeM).toBe(0)
    expect(latest()?.airborne).toBe(false)
  })

  it('is refused by a Drone that is not flying', () => {
    simulator.land(DRONE)
    tick()
    const before = latest()?.position

    simulator.command({ id: 'c2', droneId: DRONE, kind: 'return-home', issuedAt: clock.now() })
    tick()

    expect(latest()?.airborne).toBe(false)
    expect(latest()?.position).toEqual(before)
  })

  it('is refused by a Drone that has been cut', () => {
    // A latched emergency stop is not a state a Command flies out of.
    simulator.triggerEmergencyStop(DRONE)
    tick()

    simulator.command({ id: 'c3', droneId: DRONE, kind: 'return-home', issuedAt: clock.now() })
    tick(5)

    expect(latest()?.emergencyStopTriggered).toBe(true)
    expect(latest()?.airborne).toBe(false)
  })

  it('gives way to a Land, because down here beats down over there', () => {
    simulator.command({ id: 'c4', droneId: DRONE, kind: 'return-home', issuedAt: clock.now() })
    tick(2)

    simulator.command({ id: 'c5', droneId: DRONE, kind: 'land', issuedAt: clock.now() })
    tick(10)

    /*
     * Land wins, and it wins immediately: `airborne` goes false at the Command rather than
     * when the Recall would have finished. Position is deliberately not asserted — a
     * grounded craft is modelled as back on its bench whatever brought it down, which is
     * an existing simulator convention and not something this Command changed.
     */
    expect(latest()?.altitudeM).toBe(0)
    expect(latest()?.airborne).toBe(false)
  })

  it('does not leave a Recall running for the next flight', () => {
    /*
     * The stale-flag bug this guards is invisible until someone takes off again: a craft
     * that never cleared `returningHome` would fly straight back to the bench instead of
     * being flown. Drift has to be real for the two to be distinguishable, so this case
     * runs its own Fleet with the dice landing somewhere other than the middle.
     */
    const drifting = new SimulatedTelemetrySource({
      registrations: CLASSROOM_FLEET,
      clock,
      reportIntervalMs: REPORT_INTERVAL,
      random: () => 0.9,
      spontaneous: false,
    })
    const seen: TelemetryObservation[] = []
    drifting.onObservation((observation) => seen.push(observation))
    drifting.connect()

    drifting.takeOff(DRONE)
    drifting.setAltitude(DRONE, 2)
    drifting.setPosition(DRONE, 4, 0)
    drifting.command({ id: 'r', droneId: DRONE, kind: 'return-home', issuedAt: clock.now() })
    tick(40)

    // Home, landed, Recall spent.
    drifting.takeOff(DRONE)
    drifting.setAltitude(DRONE, 2)
    drifting.setPosition(DRONE, 4, 0)
    tick(2)

    const east = [...seen].reverse().find((o) => o.droneId === DRONE)?.telemetry.position?.eastM
    // Drifting on the dice, not being steered back to the bench (west of origin).
    expect(east).toBeGreaterThan(2)
  })

  it('is dropped for a Drone this Fleet does not have', () => {
    expect(() =>
      simulator.command({ id: 'c6', droneId: 'not-ours', kind: 'return-home', issuedAt: 0 }),
    ).not.toThrow()
  })
})
