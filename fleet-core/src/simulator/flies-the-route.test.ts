import { beforeEach, describe, expect, it } from 'vitest'
import type { TelemetryObservation } from '@techtechflight/contract'
import { TestClock } from '@techtechflight/contract/testing'
import { CLASSROOM_FLEET } from './classroom-fleet.ts'
import { SimulatedTelemetrySource } from './simulated-telemetry-source.ts'

/**
 * Nothing is airborne that a Teacher did not clear, and after a grant the Drone flies itself.
 *
 * The first half is the finding that mattered most on a tablet: the board opened with Drones
 * already in the air, which contradicts the product's own safety story before a Teacher has
 * touched it. It was this file's subject that did it — a dice roll on every tick inside
 * `#wander`.
 *
 * The second half is what replaces it. In a room there is a child with a controller; in a
 * demo there is nobody, so the simulated aircraft plays the child's part and the story tells
 * itself: grant, rise, fly, land.
 */

const REPORT_INTERVAL = 1_000
const DRONE = 'ttf-0001'

let clock: TestClock
let simulator: SimulatedTelemetrySource
let observed: TelemetryObservation[]

const latest = () => [...observed].reverse().find((o) => o.droneId === DRONE)?.telemetry

function tick(times = 1) {
  for (let i = 0; i < times; i += 1) clock.advance(REPORT_INTERVAL)
}

beforeEach(() => {
  clock = new TestClock(1_000_000)
  simulator = new SimulatedTelemetrySource({
    registrations: CLASSROOM_FLEET,
    clock,
    reportIntervalMs: REPORT_INTERVAL,
    random: () => 0.5,
  })
  observed = []
  simulator.onObservation((observation) => observed.push(observation))
  simulator.connect()
})

describe('nothing leaves the ground on its own', () => {
  /*
   * Spontaneous behaviour is on here, deliberately. Turning it off would test the wrong
   * thing: the point is that a demonstration Fleet left running still keeps every craft on
   * the bench, not that a pinned one does.
   *
   * `random` is a constant, so the branch that used to lift a Drone would fire on every tick
   * if it were still there. This run is the one that produced six flying Drones.
   */
  it('keeps every Drone on the bench through a long unattended run', () => {
    const wandering = new SimulatedTelemetrySource({
      registrations: CLASSROOM_FLEET,
      clock,
      reportIntervalMs: REPORT_INTERVAL,
      random: () => 0.005,
      spontaneous: true,
    })
    const seen: TelemetryObservation[] = []
    wandering.onObservation((observation) => seen.push(observation))
    wandering.connect()

    tick(600)

    expect(seen.length).toBeGreaterThan(0)
    expect(seen.every((o) => o.telemetry.airborne === false)).toBe(true)
    expect(seen.every((o) => o.telemetry.altitudeM === 0)).toBe(true)
  })

  /*
   * A fault arrives in the air, never on the bench.
   *
   * Pre-flight reads Sensors and Altitude hold straight off `fault`, so a craft that faulted
   * while sitting on a table failed its own pre-flight check: "Motion sensor needs
   * recalibrating" on an airframe that does not exist, step 4 unable to complete, step 5
   * locked behind it, and the demonstration stopped before anything flew.
   */
  it('raises a fault on a Drone that is flying', () => {
    const wandering = new SimulatedTelemetrySource({
      registrations: CLASSROOM_FLEET,
      clock,
      reportIntervalMs: REPORT_INTERVAL,
      // Inside the fault threshold and outside the lost-link one.
      random: () => 0.003,
      spontaneous: true,
    })
    const seen: TelemetryObservation[] = []
    wandering.onObservation((observation) => seen.push(observation))
    wandering.connect()
    wandering.flyRoute(DRONE, [{ eastM: 3, northM: 2 }])

    tick(4)

    expect(seen.some((o) => o.telemetry.fault !== null)).toBe(true)
  })

  it('leaves a Drone on the bench alone, so it can pass its own pre-flight', () => {
    const wandering = new SimulatedTelemetrySource({
      registrations: CLASSROOM_FLEET,
      clock,
      reportIntervalMs: REPORT_INTERVAL,
      random: () => 0.003,
      spontaneous: true,
    })
    const seen: TelemetryObservation[] = []
    wandering.onObservation((observation) => seen.push(observation))
    wandering.connect()

    tick(4)

    expect(seen.length).toBeGreaterThan(0)
    expect(seen.every((o) => o.telemetry.fault === null)).toBe(true)
    /* Altitude hold reads off the same fault, and it is the other half a Teacher sees. */
    expect(seen.every((o) => o.telemetry.extra?.altitudeHold === true)).toBe(true)
  })
})

describe('after a grant, the Drone flies its route', () => {
  const ROUTE = [
    { eastM: 3, northM: 2 },
    { eastM: 3, northM: -2 },
  ]

  it('climbs off the ground', () => {
    simulator.flyRoute(DRONE, ROUTE)
    tick(3)

    expect(latest()?.airborne).toBe(true)
    expect(latest()!.altitudeM).toBeGreaterThan(0)
  })

  /*
   * Asserted over the whole path rather than at two chosen moments, because the interesting
   * claim is that it went to both points **in order** and took time to get there. A snapshot
   * test would pass on an implementation that teleported, which is what the Recall tests
   * refuse for the same reason.
   */
  it('passes through each point in turn, and takes time doing it', () => {
    simulator.flyRoute(DRONE, ROUTE)
    tick(60)

    const path = observed
      .filter((o) => o.droneId === DRONE)
      .map((o) => o.telemetry.position!)
    const near = (index: number, point: { eastM: number; northM: number }) =>
      Math.hypot(path[index]!.eastM - point.eastM, path[index]!.northM - point.northM) <= 0.5

    const firstAt = path.findIndex((_, index) => near(index, ROUTE[0]!))
    const secondAt = path.findIndex((_, index) => near(index, ROUTE[1]!))

    expect(firstAt).toBeGreaterThan(0)
    expect(secondAt).toBeGreaterThan(firstAt)
    // 3.6 m then 4 m at 0.6 m/s. Anything much quicker is a teleport wearing a flight's name.
    expect(firstAt).toBeGreaterThanOrEqual(5)
    expect(secondAt - firstAt).toBeGreaterThanOrEqual(5)
  })

  /*
   * Every point flown and nobody has approved it yet. A Drone that wandered off after the
   * last checkpoint would take itself out of a zone it had just been judged on.
   */
  it('holds station once the last point is reached', () => {
    simulator.flyRoute(DRONE, ROUTE)
    tick(60)
    const settled = latest()!.position!

    tick(30)
    const later = latest()!.position!

    expect(later.eastM).toBeCloseTo(settled.eastM, 5)
    expect(later.northM).toBeCloseTo(settled.northM, 5)
    expect(latest()?.airborne).toBe(true)
  })

  it('will not lift a Drone whose stop is latched', () => {
    simulator.triggerEmergencyStop(DRONE)
    simulator.flyRoute(DRONE, ROUTE)
    tick(5)

    expect(latest()?.airborne).toBe(false)
  })
})

/**
 * Home is stamped leaving the ground, and only leaving the ground.
 *
 * `flyRoute` calls `takeOff`, and the demonstration calls `flyRoute` on an aircraft it has
 * already picked *because* it is airborne. Unguarded, that re-stamped home wherever the Drone
 * happened to be: after the scripted incident a Recall landed 8.5 m from the launch point
 * while the Scope's dotted line still pointed at the bench, because `HomePointTracker` reads
 * the last grounded frame and was right. The line and the aircraft disagreed, and nothing on
 * screen said so, at the one moment the demonstration exists to prove Recall trustworthy.
 */
describe('where Recall goes after a route change mid-flight', () => {
  /** Where this Drone would be Recalled to, read the only way a test can: fly it there. */
  const recallLandsAt = () => {
    simulator.returnHome(DRONE)
    tick(120)
    return latest()!.position!
  }

  it('does not move home when a route is given to a Drone already in the air', () => {
    simulator.flyRoute(DRONE, [{ eastM: 5, northM: 2 }])
    tick(30)
    const launch = { ...latest()!.position! }
    expect(Math.hypot(launch.eastM, launch.northM)).toBeGreaterThan(1)

    // The scripted incident: a second route, on an aircraft that is already up.
    simulator.flyRoute(DRONE, [{ eastM: 7.2, northM: 2 }])
    tick(20)

    const home = recallLandsAt()
    // Drone 1 is laid out at the origin, and that is where it left the ground.
    expect(Math.hypot(home.eastM, home.northM)).toBeLessThanOrEqual(0.5)
  })

  /* Re-rolling the hover height mid-flight makes an aircraft climb for no visible reason. */
  it('does not jump the hover height when a route is given mid-flight', () => {
    simulator.flyRoute(DRONE, [{ eastM: 5, northM: 2 }])
    tick(30)
    const settled = latest()!.altitudeM!

    simulator.flyRoute(DRONE, [{ eastM: 3, northM: -2 }])
    tick(5)

    expect(latest()!.altitudeM).toBeCloseTo(settled, 5)
  })

  it('still stamps home on a Drone that is genuinely on the ground', () => {
    simulator.setPosition(DRONE, 4, 1)
    simulator.flyRoute(DRONE, [{ eastM: 0, northM: -2 }])
    tick(30)

    const home = recallLandsAt()
    expect(home.eastM).toBeCloseTo(4, 1)
    expect(home.northM).toBeCloseTo(1, 1)
  })
})

describe('how a normal flight ends', () => {
  /*
   * The same flight as Recall and a different act: the child flies it home because the
   * Teacher approved the task. A Teacher who ended a normal flight with Recall would be
   * ending a lesson with the fire alarm.
   */
  it('flies home and lands after the approval', () => {
    simulator.flyRoute(DRONE, [{ eastM: 5, northM: 2 }])
    tick(30)
    expect(latest()?.airborne).toBe(true)

    simulator.flyHome(DRONE)

    // On its way, and still flying: until the ground says otherwise it is a flying Drone.
    tick(3)
    expect(latest()?.airborne).toBe(true)

    tick(40)
    expect(latest()?.airborne).toBe(false)
    expect(latest()?.altitudeM).toBe(0)
    // Home is where it left the ground, which is where the class laid the aircraft out.
    expect(latest()!.position!.eastM).toBeCloseTo(0, 1)
  })

  it('does nothing to a Drone on the bench', () => {
    simulator.flyHome(DRONE)
    tick(3)

    expect(latest()?.airborne).toBe(false)
  })
})
