import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { WebSocketServer } from 'ws'
import type { ServerMessage } from '@techtechflight/contract'
import type { GroundStation } from './fleet.ts'

export interface FleetServerOptions {
  readonly station: GroundStation
  readonly port?: number
  /**
   * Built dashboard to serve alongside the socket, so the whole ground station is one
   * process on a Teacher's laptop (ADR-0002). Optional — in development Vite serves it.
   */
  readonly dashboardDir?: string
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
  const { station, dashboardDir } = options
  const requestedPort = options.port ?? 4321

  const http = createServer((request, response) => {
    void serveStatic(request, response, dashboardDir)
  })
  const sockets = new WebSocketServer({ server: http, path: '/fleet' })

  sockets.on('connection', (socket) => {
    send(socket, { type: 'fleet-state', state: station.fleetState() })

    const unsubscribe = station.onFleetState((state) => {
      send(socket, { type: 'fleet-state', state })
    })
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

async function serveStatic(
  request: IncomingMessage,
  response: ServerResponse,
  dashboardDir: string | undefined,
): Promise<void> {
  if (!dashboardDir) {
    response.writeHead(404).end('The dashboard is served separately in development.')
    return
  }

  const root = resolve(dashboardDir)
  const requestPath = new URL(request.url ?? '/', 'http://localhost').pathname
  // Resolve inside the dashboard directory only — a traversal must not escape it.
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

/** Falls back to index.html so the dashboard owns its own routing. */
async function resolveFile(target: string, root: string): Promise<string | null> {
  const asFile = await stat(target).catch(() => null)
  if (asFile?.isFile()) return target

  const index = join(asFile?.isDirectory() ? target : root, 'index.html')
  const asIndex = await stat(index).catch(() => null)
  return asIndex?.isFile() ? index : null
}
