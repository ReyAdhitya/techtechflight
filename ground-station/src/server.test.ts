import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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

  send(message: unknown): void {
    this.#socket.send(JSON.stringify(message))
  }

  sendRaw(data: string): void {
    this.#socket.send(data)
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

/**
 * The one thing a board sends.
 *
 * The Fleet these tests run is fed by a Telemetry Source that only reports — which is what
 * a hardware adapter looks like from here — so the ground station's honest answer is a
 * refusal, and the refusal has to come back rather than being swallowed.
 */
describe('a dashboard asking for something', () => {
  it('is told when the Fleet will not carry Commands', async () => {
    const dashboard = await openDashboard()
    await dashboard.next()

    dashboard.send({
      type: 'command',
      command: { id: 'c-1', droneId: 'ttf-0001', kind: 'land', issuedAt: 1 },
    })

    const reply = (await dashboard.next()) as unknown as {
      type: string
      commandId: string
      outcome: string
      reason: string | null
    }
    expect(reply.type).toBe('command-outcome')
    expect(reply.commandId).toBe('c-1')
    expect(reply.outcome).toBe('refused')
    expect(reply.reason).toMatch(/does not accept Commands/i)
    dashboard.close()
  })

  it('carries on when a board sends something it cannot read', async () => {
    const dashboard = await openDashboard()
    await dashboard.next()

    dashboard.sendRaw('not json at all')
    dashboard.sendRaw(JSON.stringify({ type: 'command' }))

    // Still serving: a malformed frame must not take the ground station down mid-lesson.
    source.report('ttf-0001', { batteryFraction: 0.8 })
    expect((await dashboard.next()).state.drones[0]?.status).toBe('Ready')
    dashboard.close()
  })
})

/**
 * The board, served beside the socket so a School runs one process (ADR-0002).
 *
 * The layout under test is the one a Next static export actually produces: a page is a
 * file called `tower.html`, and a directory called `tower` sits beside it holding payload
 * files and no index of its own. A server that only knows how to look inside directories
 * finds that directory, finds nothing in it, and returns 404 for every screen but the home
 * page.
 */
describe('serving the board', () => {
  let boardDir: string
  let board: FleetServer

  const get = (path: string) => fetch(`http://localhost:${board.port}${path}`)

  beforeEach(async () => {
    boardDir = await mkdtemp(join(tmpdir(), 'ttf-board-'))
    await writeFile(join(boardDir, 'index.html'), '<html>the Fleet</html>')
    await writeFile(join(boardDir, 'tower.html'), '<html>the tower</html>')
    await mkdir(join(boardDir, 'tower'))
    await writeFile(join(boardDir, 'tower', 'payload.txt'), 'not a page')
    board = await startFleetServer({ station, port: 0, boardDir })
  })

  afterEach(async () => {
    await board.close()
    await rm(boardDir, { recursive: true, force: true })
  })

  it('serves the Fleet at the root', async () => {
    const response = await get('/')

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('the Fleet')
  })

  it('serves a screen from its page file, past the directory of the same name', async () => {
    const response = await get('/tower')

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('the tower')
  })

  it('still serves a directory that carries its own index', async () => {
    await mkdir(join(boardDir, 'legacy'))
    await writeFile(join(boardDir, 'legacy', 'index.html'), '<html>an older board</html>')

    const response = await get('/legacy')

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('an older board')
  })

  it('falls back to the Fleet for a path it does not recognise', async () => {
    const response = await get('/nothing-here')

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('the Fleet')
  })

  it('does not serve anything outside the board directory', async () => {
    const response = await get('/../../../etc/passwd')

    // Confined rather than found: whatever comes back is the board, never the filesystem.
    expect(await response.text()).toContain('the Fleet')
  })
})

describe('Classroom setup HTTP', () => {
  it('reports the active Simulator path', async () => {
    const setup = await startFleetServer({ station, port: 0, activeSource: 'simulator' })
    try {
      const response = await fetch(`http://localhost:${setup.port}/api/classroom-setup`)
      expect(response.status).toBe(200)
      const body = (await response.json()) as { active: string; commands: string }
      expect(body.active).toBe('simulator')
      expect(body.commands).toBe('available')
    } finally {
      await setup.close()
    }
  })

  it('reports Radio as monitoring-only', async () => {
    const setup = await startFleetServer({ station, port: 0, activeSource: 'mavlink' })
    try {
      const body = (await (
        await fetch(`http://localhost:${setup.port}/api/classroom-setup`)
      ).json()) as { active: string; commands: string }
      expect(body.active).toBe('mavlink')
      expect(body.commands).toBe('monitoring-only')
    } finally {
      await setup.close()
    }
  })
})
