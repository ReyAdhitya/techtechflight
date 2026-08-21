import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { WebSocketServer } from 'ws'
import type { ClientMessage, ServerMessage } from '@techtechflight/contract'
import type { FleetHistoryRecorder, GroundStation } from '@techtechflight/fleet-core'
import {
  isClassroomTelemetrySource,
  readPreferredClassroomSource,
  writePreferredClassroomSource,
  type ClassroomTelemetrySource,
} from './classroom-source.ts'
import { normalizeCode, readClassroom, writeClassroom } from './classroom-store.ts'
import { ipadUrl } from './lan-address.ts'
import { exportRecordsCsv, saveRecordsCopy } from './records-export.ts'
import { readLogbookFile, writeLogbookFile } from './records-logbook.ts'
import { writeLesson, type LessonSnapshot } from './records-writer.ts'

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
  /**
   * Which Telemetry Source this process opened. Settings reads it for Classroom setup.
   * Defaults to simulator when omitted (tests).
   */
  readonly activeSource?: ClassroomTelemetrySource
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
  const activeSource: ClassroomTelemetrySource = options.activeSource ?? 'simulator'
  const requestedPort = options.port ?? 4321

  const http = createServer((request, response) => {
    if (tryClassroomSetup(request, response, activeSource)) return
    if (tryClassroomAddress(request, response, portForAddress(http, requestedPort))) return
    if (tryClassroom(request, response)) return
    if (tryRecords(request, response)) return
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

/**
 * The records, on this laptop (ADR-0035).
 *
 * `PUT /api/records` writes one Lesson at its boundary. `POST /api/records/copy` and
 * `/api/records/csv` are the two Settings buttons, and neither tells a Teacher a file path:
 * they press it and a dated file appears on the Desktop.
 *
 * **Never per telemetry tick**, and there is nowhere in `LessonSnapshot` to put a live reading.
 */
function tryRecords(request: IncomingMessage, response: ServerResponse): boolean {
  const url = new URL(request.url ?? '/', 'http://localhost')
  if (!url.pathname.startsWith('/api/records')) return false

  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, PUT, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  }
  const reply = (status: number, body: unknown) => {
    response.writeHead(status, { 'content-type': 'application/json', ...cors })
    response.end(JSON.stringify(body))
  }

  if (request.method === 'OPTIONS') {
    response.writeHead(204, cors)
    response.end()
    return true
  }

  if (url.pathname === '/api/records/copy' && request.method === 'POST') {
    try {
      reply(200, { ok: true, savedTo: saveRecordsCopy() })
    } catch (error) {
      reply(500, { error: error instanceof Error ? error.message : 'Could not save a copy.' })
    }
    return true
  }

  if (url.pathname === '/api/records/csv' && request.method === 'POST') {
    try {
      reply(200, { ok: true, savedTo: exportRecordsCsv() })
    } catch (error) {
      reply(500, { error: error instanceof Error ? error.message : 'Could not export.' })
    }
    return true
  }

  if (url.pathname === '/api/records/logbook' && request.method === 'GET') {
    const stored = readLogbookFile()
    if (stored === null) {
      reply(404, { error: 'No records file yet.' })
      return true
    }
    reply(200, stored)
    return true
  }

  if (url.pathname === '/api/records/logbook' && request.method === 'PUT') {
    void readRequestBody(request).then((raw) => {
      try {
        const parsed: unknown = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          reply(400, { error: 'Body must be a Logbook snapshot with updatedAt.' })
          return
        }
        const body = parsed as { updatedAt?: unknown; book?: unknown }
        if (typeof body.updatedAt !== 'number' || body.book === undefined) {
          reply(400, { error: 'Body must be a Logbook snapshot with updatedAt.' })
          return
        }
        writeLogbookFile({ updatedAt: body.updatedAt, book: body.book })
        reply(200, { ok: true, updatedAt: body.updatedAt })
      } catch (error) {
        reply(500, {
          error: error instanceof Error ? error.message : 'Could not write the Logbook.',
        })
      }
    })
    return true
  }

  if (url.pathname === '/api/records' && request.method === 'PUT') {
    const LIMIT = 4 * 1024 * 1024
    let raw = ''
    let tooBig = false
    request.on('data', (chunk: Buffer) => {
      if (tooBig) return
      raw += chunk.toString()
      if (raw.length > LIMIT) {
        tooBig = true
        reply(413, { error: 'Lesson record too large.' })
        request.destroy()
      }
    })
    request.on('end', () => {
      if (tooBig) return
      try {
        const snapshot = JSON.parse(raw) as LessonSnapshot
        if (!snapshot || typeof snapshot.lessonId !== 'string') {
          reply(400, { error: 'Body must be a Lesson snapshot with a lessonId.' })
          return
        }
        writeLesson(snapshot)
        reply(200, { ok: true, lessonId: snapshot.lessonId })
      } catch (error) {
        reply(500, {
          error: error instanceof Error ? error.message : 'Could not write the Lesson.',
        })
      }
    })
    return true
  }

  reply(405, { error: 'Method not allowed' })
  return true
}

/**
 * The classroom store, on this laptop.
 *
 * `GET /api/classroom?code=XXXX` and `PUT` the same, which is the shape the board already
 * speaks to Cloudflare. Moving it here takes the classroom off the internet: no account, no
 * token, no request cap, and it keeps working when somebody pulls the network cable out.
 *
 * The merge lives in `classroom-store.ts` and is the Worker's rule ported rather than
 * rewritten. Nothing is refused: a tablet writing its own seat on a base a second old is the
 * ordinary case in a room, and refusing it is what made a child invisible for three days.
 */
function tryClassroom(request: IncomingMessage, response: ServerResponse): boolean {
  const url = new URL(request.url ?? '/', 'http://localhost')
  if (url.pathname !== '/api/classroom') return false

  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, PUT, OPTIONS',
    'access-control-allow-headers': 'content-type',
  }
  const reply = (status: number, body: unknown) => {
    response.writeHead(status, { 'content-type': 'application/json', ...cors })
    response.end(JSON.stringify(body))
  }

  if (request.method === 'OPTIONS') {
    response.writeHead(204, cors)
    response.end()
    return true
  }

  const code = normalizeCode(url.searchParams.get('code'))
  if (code.length < 4) {
    reply(400, { error: 'Query code must be at least four characters.', store: 'ground-station' })
    return true
  }

  if (request.method === 'GET') {
    const room = readClassroom(code)
    if (room === null) {
      reply(404, { error: 'No classroom with that code yet.', store: 'ground-station' })
      return true
    }
    reply(200, room)
    return true
  }

  if (request.method === 'PUT') {
    /*
     * Size-capped. A classroom document is about five kilobytes; anything a hundred times that
     * is a mistake or a probe, and a school laptop should not spend its memory finding out.
     */
    const LIMIT = 512 * 1024
    let raw = ''
    let tooBig = false
    request.on('data', (chunk: Buffer) => {
      if (tooBig) return
      raw += chunk.toString()
      if (raw.length > LIMIT) {
        tooBig = true
        reply(413, { error: 'Classroom document too large.', store: 'ground-station' })
        request.destroy()
      }
    })
    request.on('end', () => {
      if (tooBig) return
      let body: { code?: unknown; updatedAt?: unknown } | null = null
      try {
        body = JSON.parse(raw) as { code?: unknown; updatedAt?: unknown }
      } catch {
        body = null
      }
      if (!body || typeof body !== 'object' || typeof body.updatedAt !== 'number') {
        reply(400, {
          error: 'Body must be a classroom session with updatedAt.',
          store: 'ground-station',
        })
        return
      }
      if (normalizeCode(body.code) !== code) {
        reply(400, { error: 'Body code must match query code.', store: 'ground-station' })
        return
      }
      const next = writeClassroom(body as Parameters<typeof writeClassroom>[0])
      reply(200, {
        ok: true,
        rev: next.rev ?? 0,
        seats: (next.seats ?? []).length,
        store: 'ground-station',
      })
    })
    return true
  }

  reply(405, { error: 'Method not allowed', store: 'ground-station' })
  return true
}

/**
 * Classroom setup for Settings — Simulator, School drones, or Radio without editing `.env`.
 *
 * GET reports active + preferred source. PUT writes the preference file; the running
 * process does not hot-swap (restart required). CORS open so Next on :3000 can call :4321.
 */
function tryClassroomSetup(
  request: IncomingMessage,
  response: ServerResponse,
  activeSource: ClassroomTelemetrySource,
): boolean {
  const url = new URL(request.url ?? '/', 'http://localhost')
  if (url.pathname !== '/api/classroom-setup') return false

  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, PUT, OPTIONS',
    'access-control-allow-headers': 'content-type',
  }

  if (request.method === 'OPTIONS') {
    response.writeHead(204, cors).end()
    return true
  }

  if (request.method === 'GET') {
    const preferred = readPreferredClassroomSource()
    const body = {
      active: activeSource,
      preferred,
      restartRequired: preferred !== activeSource,
      commands: activeSource === 'simulator' ? 'available' : 'monitoring-only',
    }
    response
      .writeHead(200, { ...cors, 'content-type': 'application/json; charset=utf-8' })
      .end(JSON.stringify(body))
    return true
  }

  if (request.method === 'PUT') {
    void readRequestBody(request).then((raw) => {
      let source: ClassroomTelemetrySource | null = null
      try {
        const parsed = JSON.parse(raw) as { source?: unknown }
        if (isClassroomTelemetrySource(parsed.source)) source = parsed.source
      } catch {
        /* fall through */
      }
      if (!source) {
        response
          .writeHead(400, { ...cors, 'content-type': 'application/json; charset=utf-8' })
          .end(JSON.stringify({ error: 'source must be simulator, esp or mavlink' }))
        return
      }
      writePreferredClassroomSource(source)
      response
        .writeHead(200, { ...cors, 'content-type': 'application/json; charset=utf-8' })
        .end(
          JSON.stringify({
            preferred: source,
            active: activeSource,
            restartRequired: source !== activeSource,
            commands: activeSource === 'simulator' ? 'available' : 'monitoring-only',
          }),
        )
    })
    return true
  }

  response.writeHead(405, cors).end('Method not allowed')
  return true
}

/**
 * The URL an iPad types, so a Teacher can copy it from Settings without reading a terminal.
 *
 * Same address the launcher prints and draws as a QR. `/student` is the door; the Teacher
 * board stays on localhost, which is what keeps the camera working.
 */
function tryClassroomAddress(
  request: IncomingMessage,
  response: ServerResponse,
  port: number,
): boolean {
  const url = new URL(request.url ?? '/', 'http://localhost')
  if (url.pathname !== '/api/classroom-address') return false

  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
  }

  if (request.method === 'OPTIONS') {
    response.writeHead(204, cors).end()
    return true
  }

  if (request.method === 'GET') {
    response
      .writeHead(200, { ...cors, 'content-type': 'application/json; charset=utf-8' })
      .end(JSON.stringify({ url: ipadUrl(port) }))
    return true
  }

  response.writeHead(405, cors).end('Method not allowed')
  return true
}

function portForAddress(
  http: { address(): string | { port: number } | null },
  fallback: number,
): number {
  const address = http.address()
  return typeof address === 'object' && address !== null ? address.port : fallback
}

function readRequestBody(request: IncomingMessage): Promise<string> {
  return new Promise((done, fail) => {
    const chunks: Buffer[] = []
    request.on('data', (chunk: Buffer) => chunks.push(chunk))
    request.on('end', () => done(Buffer.concat(chunks).toString('utf8')))
    request.on('error', fail)
  })
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
