import { beforeEach, describe, expect, it } from 'vitest'
import type { FleetHistory, FleetState } from '@techtechflight/contract'
import { TestClock } from '@techtechflight/contract/testing'
import { FleetConnection, type FleetSocket } from './fleet-connection'
import { LocalFleetLink } from './local-fleet-link'

/**
 * The two ways a board gets a Fleet, held against each other.
 *
 * This is the assertion the whole arrangement rests on: a screen reads a FleetSnapshot and
 * must not be able to tell whether the Fleet core producing it is running in this browser
 * or on a laptop across the room. If that ever stops being true, the demonstration and the
 * product have begun to drift, which is exactly what the seam was drawn to prevent.
 *
 * The socket link is fed precisely what a ground station running the same core would send,
 * so this also tests the wire: everything below survives being serialised and parsed.
 */

class FakeSocket implements FleetSocket {
  #open: (() => void) | null = null
  #message: ((data: string) => void) | null = null
  #close: (() => void) | null = null

  onOpen(listener: () => void) {
    this.#open = listener
  }
  onMessage(listener: (data: string) => void) {
    this.#message = listener
  }
  onClose(listener: () => void) {
    this.#close = listener
  }
  close() {
    this.#close?.()
  }

  accept() {
    this.#open?.()
  }
  send(message: unknown) {
    this.#message?.(JSON.stringify(message))
  }
}

let clock: TestClock
let local: LocalFleetLink

/** The same Fleet, carried over a wire the way the ground station would carry it. */
function acrossASocket(state: FleetState | null, history: FleetHistory | null | undefined) {
  const socket = new FakeSocket()
  const connection = new FleetConnection({
    url: 'ws://localhost:4321/fleet',
    clock,
    createSocket: () => socket,
  })
  connection.start()
  socket.accept()
  if (state) socket.send({ type: 'fleet-state', state })
  if (history) socket.send({ type: 'fleet-history', history })
  return connection
}

beforeEach(() => {
  clock = new TestClock(1_000_000)
  local = new LocalFleetLink({
    clock,
    reportIntervalMs: 1_000,
    random: () => 0.5,
    spontaneous: false,
  })
})

describe('a Fleet here and a Fleet across a socket', () => {
  it('tell the board exactly the same thing', () => {
    local.start()
    clock.advance(2_000)
    local.scenarios.takeOff('ttf-0001')
    local.scenarios.injectFault('ttf-0004')
    clock.advance(3_000)

    const remote = acrossASocket(local.snapshot.state, local.snapshot.history)

    expect(remote.snapshot.connection).toBe(local.snapshot.connection)
    expect(remote.snapshot.state).toEqual(local.snapshot.state)
    expect(remote.snapshot.history?.events).toEqual(local.snapshot.history?.events)
    local.stop()
  })

  it('agree about every Drone’s Status', () => {
    local.start()
    clock.advance(2_000)
    local.scenarios.injectFault('ttf-0002')
    local.scenarios.loseLink('ttf-0003')
    clock.advance(70_000)

    const remote = acrossASocket(local.snapshot.state, local.snapshot.history)

    const statuses = (state: FleetState | null) =>
      state?.drones.map((drone) => `${drone.name}=${drone.status}`)

    expect(statuses(remote.snapshot.state)).toEqual(statuses(local.snapshot.state))
    // And that the scenario actually produced a spread worth comparing.
    expect(new Set(statuses(local.snapshot.state)).size).toBeGreaterThan(1)
    local.stop()
  })

  /**
   * The distinction the whole product is built on, tested where it is most likely to be
   * lost. `undefined` means this airframe cannot report a thing at all; `null` means it
   * can and has nothing to report. JSON has an opinion about only one of them, so the
   * wire is exactly where the two could quietly become the same.
   */
  it('keeps a sensor that is missing apart from one that sees nothing', () => {
    local.start()
    clock.advance(2_000)
    local.scenarios.takeOff('ttf-0001')
    clock.advance(2_000)

    const remote = acrossASocket(local.snapshot.state, local.snapshot.history)
    const droneOnTheWire = (id: string) =>
      remote.snapshot.state?.drones.find((drone) => drone.id === id)?.telemetry

    // The simulator gives every third airframe no rangefinder at all.
    const withoutSensor = droneOnTheWire('ttf-0003')
    const withSensor = droneOnTheWire('ttf-0001')

    expect(withoutSensor).toBeDefined()
    expect(withoutSensor && 'proximity' in withoutSensor).toBe(false)
    expect(withSensor?.proximity).not.toBeUndefined()
    local.stop()
  })

  it('carry the same record of what happened', () => {
    local.start()
    clock.advance(2_000)
    local.scenarios.injectFault('ttf-0005')
    clock.advance(2_000)

    const remote = acrossASocket(local.snapshot.state, local.snapshot.history)

    const kinds = (history: FleetHistory | null | undefined) =>
      history?.events.map((event) => `${event.droneId}:${event.kind}`)

    expect(kinds(remote.snapshot.history)).toEqual(kinds(local.snapshot.history))
    expect(kinds(local.snapshot.history)).toContain('ttf-0005:fault-raised')
    local.stop()
  })
})
