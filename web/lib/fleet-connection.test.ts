import { beforeEach, describe, expect, it } from 'vitest'
import { TestClock } from '@techtechflight/contract/testing'
import { aDroneState, aFleetState } from '@techtechflight/contract/fixtures'
import { FleetConnection, type FleetSnapshot, type FleetSocket } from './fleet-connection'

/**
 * Reconnection is time-driven, so it is driven by the injected Clock and never a sleep.
 */

class FakeSocket implements FleetSocket {
  #open: (() => void) | null = null
  #message: ((data: string) => void) | null = null
  #close: (() => void) | null = null
  closed = false

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
    this.closed = true
  }

  // --- what the ground station would do ---
  accept() {
    this.#open?.()
  }
  deliver(state: unknown) {
    this.#message?.(JSON.stringify({ type: 'fleet-state', state }))
  }
  deliverRaw(data: string) {
    this.#message?.(data)
  }
  drop() {
    this.#close?.()
  }
}

let clock: TestClock
let sockets: FakeSocket[]
let connection: FleetConnection
let seen: FleetSnapshot[]

const latestSocket = () => sockets.at(-1)!

beforeEach(() => {
  clock = new TestClock(5_000_000)
  sockets = []
  connection = new FleetConnection({
    url: 'ws://localhost:4321/fleet',
    clock,
    createSocket: () => {
      const socket = new FakeSocket()
      sockets.push(socket)
      return socket
    },
    backoffMs: [500, 1_000, 2_000],
  })
  seen = []
  connection.subscribe((snapshot) => seen.push(snapshot))
  connection.start()
})

describe('coming up', () => {
  it('starts out connecting, with nothing to show yet', () => {
    expect(connection.snapshot.connection).toBe('connecting')
    expect(connection.snapshot.state).toBeNull()
  })

  it('goes live once the ground station accepts', () => {
    latestSocket().accept()

    expect(connection.snapshot.connection).toBe('live')
  })

  it('shows the Fleet as soon as the first snapshot arrives', () => {
    latestSocket().accept()
    latestSocket().deliver(aFleetState([aDroneState({ name: 'Drone 1' })], 5_000_000))

    expect(connection.snapshot.state?.drones[0]?.name).toBe('Drone 1')
    expect(connection.snapshot.receivedAt).toBe(clock.now())
  })

  it('ignores a malformed frame rather than blanking the board mid-lesson', () => {
    latestSocket().accept()
    latestSocket().deliver(aFleetState([aDroneState({ name: 'Drone 1' })]))

    latestSocket().deliverRaw('not json at all')

    expect(connection.snapshot.state?.drones[0]?.name).toBe('Drone 1')
  })

  it('ignores a frame of a kind it has never been told about', () => {
    latestSocket().accept()
    latestSocket().deliver(aFleetState([aDroneState({ name: 'Drone 1' })]))

    // Well-formed JSON, unknown type. A ground station newer than this board would send
    // one, and the board has to carry on rather than fall over on a message meant for a
    // later version of itself.
    latestSocket().deliverRaw(JSON.stringify({ type: 'something-newer', payload: 1 }))

    expect(connection.snapshot.state?.drones[0]?.name).toBe('Drone 1')
    expect(connection.snapshot.history).toBeUndefined()
  })
})

describe('when the ground station goes away', () => {
  beforeEach(() => {
    latestSocket().accept()
    latestSocket().deliver(aFleetState([aDroneState({ name: 'Drone 1' })], 5_000_000))
  })

  it('reports the ground station unreachable, distinct from any Drone being Offline', () => {
    latestSocket().drop()

    expect(connection.snapshot.connection).toBe('unreachable')
  })

  it('keeps the last known Fleet on screen while it is away', () => {
    latestSocket().drop()

    expect(connection.snapshot.state?.drones[0]?.name).toBe('Drone 1')
    expect(connection.snapshot.receivedAt).toBe(5_000_000)
  })

  it('reconnects by itself after the first backoff, with no Teacher involvement', () => {
    latestSocket().drop()
    expect(sockets).toHaveLength(1)

    clock.advance(500)

    expect(sockets).toHaveLength(2)
  })

  it('backs off further on each failed attempt', () => {
    latestSocket().drop()
    clock.advance(500)
    expect(sockets).toHaveLength(2)

    latestSocket().drop()
    clock.advance(500)
    expect(sockets).toHaveLength(2)
    clock.advance(500)
    expect(sockets).toHaveLength(3)
  })

  it('holds at the longest backoff rather than growing without limit', () => {
    for (let attempt = 0; attempt < 6; attempt++) {
      latestSocket().drop()
      clock.advance(2_000)
    }

    const socketsSoFar = sockets.length
    latestSocket().drop()
    clock.advance(2_000)

    expect(sockets).toHaveLength(socketsSoFar + 1)
  })

  it('goes back to live and resets its backoff once it reconnects', () => {
    latestSocket().drop()
    clock.advance(500)
    latestSocket().accept()
    expect(connection.snapshot.connection).toBe('live')

    latestSocket().drop()
    clock.advance(500)

    expect(sockets).toHaveLength(3)
  })

  it('replaces the Fleet with whatever the ground station says on reconnecting', () => {
    latestSocket().drop()
    clock.advance(500)
    latestSocket().accept()
    latestSocket().deliver(aFleetState([aDroneState({ name: 'Drone 9' })], 5_001_000))

    expect(connection.snapshot.state?.drones[0]?.name).toBe('Drone 9')
  })
})

describe('shutting down', () => {
  it('stops retrying once stopped', () => {
    latestSocket().accept()
    connection.stop()
    latestSocket().drop()

    clock.advance(60_000)

    expect(sockets).toHaveLength(1)
  })

  it('closes the socket it holds', () => {
    const socket = latestSocket()
    socket.accept()
    connection.stop()

    expect(socket.closed).toBe(true)
  })
})

describe('telling the board about it', () => {
  it('notifies subscribers as the connection changes', () => {
    latestSocket().accept()
    latestSocket().drop()

    /*
     * Compared as transitions rather than as every snapshot published. A history or
     * events frame publishes a snapshot too without the connection having changed, so
     * asserting the whole sequence would tie a test about connection state to how many
     * other kinds of message happened to arrive.
     */
    const transitions = seen
      .map((snapshot) => snapshot.connection)
      .filter((status, index, all) => status !== all[index - 1])

    expect(transitions).toEqual(['live', 'unreachable'])
  })
})
