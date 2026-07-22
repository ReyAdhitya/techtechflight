import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import WebSocket from 'ws'
import type { FleetStateMessage } from '@techtechflight/contract'
import { TestClock } from '@techtechflight/contract/testing'
import { GroundStation } from '@techtechflight/fleet-core'
import { FakeTelemetrySource } from '@techtechflight/fleet-core/testing'
import { startFleetServer, type FleetServer } from './server.ts'

/**
 * The transport around seam 1. These cover only what the socket itself promises — a
 * complete snapshot on connect, and pushes after that. The Fleet rules are tested
 * against the ground station directly, with no sockets involved.
 */

let clock: TestClock
let source: FakeTelemetrySource
let station: GroundStation
let server: FleetServer

/**
 * A dashboard, from the socket's point of view.
 *
 * Messages are queued from the moment the socket exists rather than after `open`
 * resolves, because the snapshot the server sends on connection can arrive first — and
 * a listener attached later would never see it.
 */
class TestDashboard {
  readonly #socket: WebSocket
  readonly #received: FleetStateMessage[] = []
  #waiting: ((message: FleetStateMessage) => void) | null = null

  constructor(socket: WebSocket) {
    this.#socket = socket
    socket.on('message', (raw: Buffer) => {
      const message = JSON.parse(raw.toString()) as FleetStateMessage
      if (this.#waiting) {
        const notify = this.#waiting
        this.#waiting = null
        notify(message)
        return
      }
      this.#received.push(message)
    })
  }

  next(): Promise<FleetStateMessage> {
    const queued = this.#received.shift()
    if (queued) return Promise.resolve(queued)
    return new Promise((done) => {
      this.#waiting = done
    })
  }

  close(): void {
    this.#socket.close()
  }
}

const openDashboard = async (): Promise<TestDashboard> => {
  const socket = new WebSocket(`ws://localhost:${server.port}/fleet`)
  const dashboard = new TestDashboard(socket)
  await new Promise((done, fail) => {
    socket.once('open', done)
    socket.once('error', fail)
  })
  return dashboard
}

beforeEach(async () => {
  clock = new TestClock(1_000_000)
  source = new FakeTelemetrySource()
  station = new GroundStation({
    registrations: [
      { id: 'ttf-0001', name: 'Drone 1', boardOrder: 1 },
      { id: 'ttf-0002', name: 'Drone 2', boardOrder: 2 },
    ],
    source,
    clock,
  })
  station.start()
  // Port 0 asks the OS for a free one, so a busy machine cannot flake the suite.
  server = await startFleetServer({ station, port: 0 })
})

afterEach(async () => {
  station.stop()
  await server.close()
})

describe('a dashboard connecting', () => {
  it('is sent a complete Fleet State immediately, so a screen opened mid-lesson is right', async () => {
    source.report('ttf-0001', { batteryFraction: 0.8 })

    const dashboard = await openDashboard()
    const message = await dashboard.next()

    expect(message.type).toBe('fleet-state')
    expect(message.state.drones).toHaveLength(2)
    expect(message.state.drones[0]?.status).toBe('Ready')
    expect(message.state.drones[1]?.status).toBe('Offline')

    dashboard.close()
  })

  it('is pushed the new Fleet State when a Drone changes', async () => {
    const dashboard = await openDashboard()
    await dashboard.next()

    source.report('ttf-0002', { batteryFraction: 0.1 })

    expect((await dashboard.next()).state.drones[1]?.status).toBe('Not Ready')
    dashboard.close()
  })

  it('serves every connected dashboard the same Fleet State', async () => {
    const projector = await openDashboard()
    const laptop = await openDashboard()
    await Promise.all([projector.next(), laptop.next()])

    source.report('ttf-0001', { batteryFraction: 0.9 })
    const [onProjector, onLaptop] = await Promise.all([projector.next(), laptop.next()])

    expect(onProjector.state.drones).toEqual(onLaptop.state.drones)
    projector.close()
    laptop.close()
  })
})
