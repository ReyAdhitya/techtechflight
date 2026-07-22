import { beforeEach, describe, expect, it } from 'vitest'
import type { DroneRegistration } from '@techtechflight/contract'
import { TestClock } from '@techtechflight/contract/testing'
import { LocalFleetLink } from './local-fleet-link'

/**
 * The Fleet, running here.
 *
 * What is being tested is not that the class wires four objects together — it is that the
 * Fleet it produces actually behaves. The board could always show a Fleet without a
 * server; what it could not do was show one where anything changed. Every case below is
 * something the hard-coded fixtures it replaces could never have exhibited.
 */

const FLEET: readonly DroneRegistration[] = [
  { id: 'ttf-0001', name: 'Drone 1', boardOrder: 1 },
  { id: 'ttf-0002', name: 'Drone 2', boardOrder: 2 },
]

let clock: TestClock
let link: LocalFleetLink

const build = () =>
  new LocalFleetLink({
    clock,
    registrations: FLEET,
    reportIntervalMs: 1_000,
    // Pinned: an unprompted take-off or fault would make these assertions weather.
    random: () => 0.5,
    spontaneous: false,
  })

beforeEach(() => {
  clock = new TestClock(1_000_000)
  link = build()
})

describe('a Fleet with no ground station behind it', () => {
  it('has nothing to show before it is started', () => {
    expect(link.snapshot.state).toBeNull()
    expect(link.snapshot.connection).toBe('connecting')
  })

  it('is live the moment it starts, with every Drone the School owns', () => {
    link.start()

    expect(link.snapshot.connection).toBe('live')
    expect(link.snapshot.state?.drones).toHaveLength(2)
    link.stop()
  })

  it('reports a Drone Offline until it has said something', () => {
    link.start()

    expect(link.snapshot.state?.drones[0]?.status).toBe('Offline')
    link.stop()
  })

  it('brings Drones into contact as Telemetry arrives', () => {
    link.start()

    clock.advance(1_000)

    expect(link.snapshot.state?.drones[0]?.status).not.toBe('Offline')
    expect(link.snapshot.state?.drones[0]?.telemetry).not.toBeNull()
    link.stop()
  })

  it('publishes to whoever is watching, not only on demand', () => {
    const seen: number[] = []
    link.subscribe((snapshot) => seen.push(snapshot.state?.drones.length ?? 0))
    link.start()

    clock.advance(3_000)

    expect(seen.length).toBeGreaterThan(1)
    link.stop()
  })

  it('ages a Drone that falls silent into Stale and then Offline', () => {
    link.start()
    clock.advance(1_000)
    expect(link.snapshot.state?.drones[0]?.status).toBe('Ready')

    link.scenarios.loseLink('ttf-0001')
    clock.advance(11_000)
    expect(link.snapshot.state?.drones[0]?.stale).toBe(true)

    clock.advance(60_000)
    expect(link.snapshot.state?.drones[0]?.status).toBe('Offline')
    link.stop()
  })

  it('keeps a record of what happened', () => {
    link.start()
    clock.advance(1_000)

    expect(link.snapshot.history?.events.length).toBeGreaterThan(0)
    expect(link.snapshot.history?.events[0]?.kind).toBe('first-contact')
    link.stop()
  })

  it('carries a Fault through to the Fleet State', () => {
    link.start()
    clock.advance(1_000)

    link.scenarios.injectFault('ttf-0002')
    clock.advance(1_000)

    expect(link.snapshot.state?.drones[1]?.status).toBe('Fault')
    link.stop()
  })

  /**
   * The one that matters.
   *
   * A Drone climbing is the case the hard-coded fixtures made unreachable: altitude was a
   * literal, so the vertical rate the tower derives was always zero and the `climbing` and
   * `descending` phases could never appear on the deployed board however long anyone
   * watched it.
   */
  it('flies a Drone, so height actually changes between readings', () => {
    link.start()
    clock.advance(1_000)
    const onTheGround = link.snapshot.state?.drones[0]?.telemetry?.altitudeM ?? 0

    link.scenarios.takeOff('ttf-0001')
    clock.advance(2_000)
    const climbing = link.snapshot.state?.drones[0]?.telemetry?.altitudeM ?? 0

    expect(onTheGround).toBe(0)
    expect(climbing).toBeGreaterThan(0)
    expect(link.snapshot.state?.drones[0]?.status).toBe('Flying')
    link.stop()
  })

  it('drains a battery while a Drone is up, so charge is not a constant', () => {
    link.start()
    clock.advance(1_000)
    const full = link.snapshot.state?.drones[0]?.telemetry?.batteryFraction ?? 0

    link.scenarios.takeOff('ttf-0001')
    clock.advance(60_000)
    const later = link.snapshot.state?.drones[0]?.telemetry?.batteryFraction ?? 0

    expect(later).toBeLessThan(full)
    link.stop()
  })

  it('stops producing Telemetry once stopped', () => {
    link.start()
    clock.advance(1_000)
    const at = link.snapshot.receivedAt

    link.stop()
    clock.advance(5_000)

    expect(link.snapshot.receivedAt).toBe(at)
  })
})
