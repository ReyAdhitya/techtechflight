import type {
  Clock,
  FleetEvent,
  FleetHistory,
  ServerMessage,
  Unsubscribe,
} from '@techtechflight/contract'
import type { FleetLink, FleetSnapshot } from './fleet-link'

/** How many events a board keeps once the ground station starts streaming them. */
const MAX_RETAINED_EVENTS = 500

// The shape of what a board reads lives with the seam rather than with this
// implementation of it, so the browser-hosted one describes itself the same way.
export type { ConnectionStatus, FleetSnapshot } from './fleet-link'

/** The bit of a WebSocket this needs, so tests can hand it something simpler. */
export interface FleetSocket {
  onOpen(listener: () => void): void
  onMessage(listener: (data: string) => void): void
  onClose(listener: () => void): void
  close(): void
}

export interface FleetConnectionOptions {
  readonly url: string
  readonly clock: Clock
  readonly createSocket: (url: string) => FleetSocket
  /** Delays between reconnection attempts. The last is reused once exhausted. */
  readonly backoffMs?: readonly number[]
}

const DEFAULT_BACKOFF: readonly number[] = [500, 1_000, 2_000, 4_000, 8_000]

/**
 * Holds the connection to the ground station and reconnects on its own.
 *
 * A Teacher should never have to know how to restart anything, so a dropped connection
 * is retried with backoff indefinitely. The last known Fleet State is retained across
 * the gap — it is still the truth as of when it arrived, and every value on the board
 * carries its age.
 */
export class FleetConnection implements FleetLink {
  readonly #options: FleetConnectionOptions
  readonly #backoff: readonly number[]
  #listeners = new Set<(snapshot: FleetSnapshot) => void>()
  #snapshot: FleetSnapshot = { connection: 'connecting', state: null, receivedAt: null }
  #socket: FleetSocket | null = null
  #cancelRetry: Unsubscribe | null = null
  #attempt = 0
  #stopped = false

  constructor(options: FleetConnectionOptions) {
    this.#options = options
    this.#backoff = options.backoffMs ?? DEFAULT_BACKOFF
  }

  get snapshot(): FleetSnapshot {
    return this.#snapshot
  }

  subscribe(listener: (snapshot: FleetSnapshot) => void): Unsubscribe {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  start(): void {
    this.#stopped = false
    this.#open()
  }

  stop(): void {
    this.#stopped = true
    this.#cancelRetry?.()
    this.#cancelRetry = null
    this.#socket?.close()
    this.#socket = null
  }

  #open(): void {
    if (this.#stopped) return
    this.#update({ connection: this.#attempt === 0 ? 'connecting' : this.#snapshot.connection })

    const socket = this.#options.createSocket(this.#options.url)
    this.#socket = socket

    socket.onOpen(() => {
      this.#attempt = 0
      this.#update({ connection: 'live' })
    })

    socket.onMessage((data) => {
      const message = parse(data)
      if (!message) return

      if (message.type === 'fleet-state') {
        this.#update({
          connection: 'live',
          state: message.state,
          receivedAt: this.#options.clock.now(),
        })
        return
      }

      if (message.type === 'fleet-history') {
        this.#update({ connection: 'live', history: message.history })
        return
      }

      /*
       * Events arrive as they happen and are folded into the history already held, so
       * every screen reads one list rather than stitching a snapshot to a stream. Merged
       * by id: a reconnect re-sends the whole history, and a Teacher must not see this
       * morning's fault twice because the socket blinked.
       */
      this.#update({ history: mergeEvents(this.#snapshot.history, message.events) })
    })

    socket.onClose(() => {
      if (this.#stopped) return
      this.#socket = null
      this.#update({ connection: 'unreachable' })
      this.#scheduleRetry()
    })
  }

  #scheduleRetry(): void {
    const delay = this.#backoff[Math.min(this.#attempt, this.#backoff.length - 1)]!
    this.#attempt += 1
    this.#cancelRetry = this.#options.clock.setTimeout(() => {
      this.#cancelRetry = null
      this.#open()
    }, delay)
  }

  #update(changes: Partial<FleetSnapshot>): void {
    const next: FleetSnapshot = { ...this.#snapshot, ...changes }
    if (
      next.connection === this.#snapshot.connection &&
      next.state === this.#snapshot.state &&
      next.receivedAt === this.#snapshot.receivedAt &&
      next.history === this.#snapshot.history
    ) {
      return
    }
    this.#snapshot = next
    for (const listener of this.#listeners) listener(next)
  }
}

/**
 * Fold newly-streamed events into the history already held.
 *
 * Deduped by id and re-sorted by time. Event ids are derived from the transition rather
 * than generated (see the ground station's `history.ts`), which is what makes this safe
 * to run over a reconnect that replays everything.
 */
function mergeEvents(
  history: FleetHistory | null | undefined,
  incoming: readonly FleetEvent[],
): FleetHistory {
  const base = history ?? { events: [], batteries: [], since: incoming[0]?.at ?? 0 }
  const byId = new Map(base.events.map((event) => [event.id, event]))
  for (const event of incoming) byId.set(event.id, event)

  const events = [...byId.values()]
    .sort((a, b) => a.at - b.at)
    .slice(-MAX_RETAINED_EVENTS)

  return { ...base, events }
}

function parse(data: string): ServerMessage | null {
  try {
    const message = JSON.parse(data) as ServerMessage
    const known: readonly ServerMessage['type'][] = [
      'fleet-state',
      'fleet-history',
      'fleet-events',
    ]
    return known.includes(message.type) ? message : null
  } catch {
    // A malformed frame is dropped rather than blanking a board mid-lesson.
    return null
  }
}

/** Adapts a browser WebSocket to the slice this module needs. */
export function browserSocket(url: string): FleetSocket {
  const socket = new WebSocket(url)
  return {
    onOpen: (listener) => socket.addEventListener('open', () => listener()),
    onMessage: (listener) =>
      socket.addEventListener('message', (event: MessageEvent<string>) => listener(event.data)),
    onClose: (listener) => {
      socket.addEventListener('close', () => listener())
      socket.addEventListener('error', () => socket.close())
    },
    close: () => socket.close(),
  }
}
