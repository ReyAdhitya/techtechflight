import type {
  Clock,
  FleetEvent,
  FleetHistory,
  FleetState,
  ServerMessage,
  Unsubscribe,
} from '@techtechflight/contract'

/** How many events a board keeps once the ground station starts streaming them. */
const MAX_RETAINED_EVENTS = 500

/**
 * Whether the board is in touch with the ground station.
 *
 * This is deliberately not a Status: a broken dashboard and a cupboard full of switched
 * off Drones must never look the same, so the two live in different vocabularies.
 */
export type ConnectionStatus = 'connecting' | 'live' | 'unreachable'

export interface FleetSnapshot {
  readonly connection: ConnectionStatus
  /** The last Fleet State received, kept while reconnecting so the board is not blank. */
  readonly state: FleetState | null
  /** Browser clock reading when `state` arrived — the anchor for computing ages. */
  readonly receivedAt: number | null
  /**
   * The recent past, as far back as the ground station kept it.
   *
   * Optional rather than required: a ground station running without a recorder, and
   * every board built before this existed, simply have none — and a missing timeline
   * has to degrade to no timeline rather than to a broken screen.
   */
  readonly history?: FleetHistory | null
}

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
export class FleetConnection {
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
