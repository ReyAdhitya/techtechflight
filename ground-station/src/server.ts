import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { WebSocketServer } from 'ws'
import type { ClientMessage, ServerMessage } from '@techtechflight/contract'
import type { FleetHistoryRecorder, GroundStation } from '@techtechflight/fleet-core'

export interface FleetServerOptions {
  readonly station: GroundStation
  readonly port?: number
  /**
   * Built board to serve alongside the socket, so the whole ground station is one
   * process on a Teacher's laptop (ADR-0002). Optional — in development Next serves it.
   */
  readonly boardDir?: string
  /**
   * The record of the recent past, sent once on connect and then streamed.
   *
   * Optional so a ground station can run without one — a board that receives no history
   * shows no timeline rather than failing, which is the same graceful-absence rule the
   * rest of the product follows.
   */
  readonly history?: FleetHistoryRecorder
}

export interface FleetServer {
  readonly port: number
  close(): Promise<void>
}

/**
 * Serves one WebSocket carrying Fleet State.
 *
 * A dashboard is sent a complete snapshot the moment it connects, so a screen opened
 * mid-lesson is immediately correct with no replay. This is a transport around seam 1
 * and holds no Fleet logic of its own.
 */
export async function startFleetServer(options: FleetServerOptions): Promise<FleetServer> {
  const { station, boardDir, history } = options
  const requestedPort = options.port ?? 4321

  const http = createServer((request, response) => {
    void serveStatic(request, response, boardDir)
  })
  const sockets = new WebSocketServer({ server: http, path: '/fleet' })

  sockets.on('connection', (socket) => {
    /*
     * Snapshot first, then the past. A board that painted a timeline before it had a
     * Fleet to hang it on would show a Teacher what happened to Drones it was not yet
     * displaying — and the snapshot is the thing they opened the board for.
     */
    send(socket, { type: 'fleet-state', state: station.fleetState() })
    if (history) send(socket, { type: 'fleet-history', history: history.history() })

    /*
     * The one thing a board ever sends. Whether it can be carried at all is decided by
     * the Fleet core, which asks the Telemetry Source — a hardware Fleet refuses, and the
     * refusal comes back in words rather than as silence (ADR-0011).
     */
    socket.on('message', (raw: Buffer) => {
      const message = parseClient(raw.toString())
      if (!message) return
      const outcome = station.command(message.command)
      send(socket, {
        type: 'command-outcome',
        commandId: message.command.id,
        ...outcome,
      })
    })

    const unsubscribeState = station.onFleetState((state) => {
      send(socket, { type: 'fleet-state', state })
    })
    const unsubscribeEvents = history?.onEvents((events) => {
      send(socket, { type: 'fleet-events', events })
    })

    const unsubscribe = () => {
      unsubscribeState()
      unsubscribeEvents?.()
    }
    socket.on('close', unsubscribe)
    socket.on('error', unsubscribe)
  })

  await new Promise<void>((resolvePort, reject) => {
    http.once('error', reject)
    http.listen(requestedPort, () => {
      http.off('error', reject)
      resolvePort()
    })
  })

  const address = http.address()
  const port = typeof address === 'object' && address !== null ? address.port : requestedPort

  return {
    port,
    close: () =>
      new Promise<void>((done) => {
        for (const client of sockets.clients) client.terminate()
        sockets.close(() => http.close(() => done()))
      }),
  }
}

function send(socket: { readyState: number; send(data: string): void }, message: ServerMessage) {
  const OPEN = 1
  if (socket.readyState !== OPEN) return
  socket.send(JSON.stringify(message))
}

const MIME_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
}

/** A malformed or unrecognised frame is dropped rather than crashing the ground station. */
function parseClient(data: string): ClientMessage | null {
  try {
    const message = JSON.parse(data) as ClientMessage
    return message.type === 'command' && typeof message.command?.droneId === 'string'
      ? message
      : null
  } catch {
    return null
  }
}

async function serveStatic(
  request: IncomingMessage,
  response: ServerResponse,
  boardDir: string | undefined,
): Promise<void> {
  if (!boardDir) {
    response.writeHead(404).end('The board is served separately in development.')
    return
  }

  const root = resolve(boardDir)
  const requestPath = new URL(request.url ?? '/', 'http://localhost').pathname
  // Resolve inside the board directory only — a traversal must not escape it.
  const candidate = resolve(join(root, normalize(requestPath)))
  const target = candidate.startsWith(root) ? candidate : root

  const file = await resolveFile(target, root)
  if (!file) {
    response.writeHead(404).end('Not found')
    return
  }

  const body = await readFile(file)
  response
    .writeHead(200, { 'content-type': MIME_TYPES[extname(file)] ?? 'application/octet-stream' })
    .end(body)
}

/**
 * The file behind a request path: the file itself, then its page, then a directory's own
 * index, and finally the board's index so the board owns its own routing.
 *
 * The page step is what a static export needs. It names a screen `tower.html` and puts a
 * `tower` directory beside it holding payloads and no index of its own, so a server that
 * only knows how to look inside directories finds that directory, finds nothing in it,
 * and returns 404 for every screen except the home page. The hosted deploy gets this rule
 * from `cleanUrls`; served from a Teacher's laptop it has to be here.
 */
async function resolveFile(target: string, root: string): Promise<string | null> {
  const asFile = await stat(target).catch(() => null)
  if (asFile?.isFile()) return target

  /*
   * Never for the root itself. `target` is already confined to the board directory, and
   * appending to anything below it stays below it — but the root plus `.html` names a
   * sibling of the board rather than something inside it, which is exactly the kind of
   * reach outside that the confinement above exists to prevent.
   */
  if (target !== root) {
    const asPage = await stat(`${target}.html`).catch(() => null)
    if (asPage?.isFile()) return `${target}.html`
  }

  const index = join(asFile?.isDirectory() ? target : root, 'index.html')
  const asIndex = await stat(index).catch(() => null)
  return asIndex?.isFile() ? index : null
}
