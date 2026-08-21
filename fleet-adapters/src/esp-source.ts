import { createSocket, type Socket } from 'node:dgram'
import type {
  Clock,
  DroneId,
  TelemetryObservation,
  TelemetrySource,
  Unsubscribe,
} from '@techtechflight/contract'

/**
 * The door the school's own drones knock on.
 *
 * The aircraft are DIY, built on ESP32, with firmware the school's drone team writes, and they
 * signal over Wi-Fi. MAVLink is a standard for bought flight controllers and is not this
 * project's path. So this is not a protocol: it is **a door on the laptop that accepts small
 * JSON over UDP**, and whatever the drone team builds can reach the board through it without
 * this project depending on decisions they have not made yet.
 *
 * ```json
 * { "id": "drone-3", "battery": 0.74, "height": 2.1, "east": 1.2, "north": -0.4, "airborne": true }
 * ```
 *
 * Ten lines on their side and no library:
 *
 * ```cpp
 * udp.beginPacket(LAPTOP_IP, 14555);
 * udp.printf("{\\"id\\":\\"drone-3\\",\\"battery\\":%.2f,\\"height\\":%.2f}", batt, alt);
 * udp.endPacket();
 * ```
 *
 * **This cannot be wasted work.** It assumes nothing about their radio, their handset or their
 * naming. If they invent their own format somebody writes a thirty-line translator; if they
 * surprise everyone and use MAVLink, that adapter is already in the tree. And it is testable
 * with no aircraft in the room: send packets from the laptop itself and watch the board.
 *
 * Monitoring only. It does not implement `CommandableSource`, so nothing here reaches an
 * aircraft (ADR-0011). What Stop can mean in the air, when disarming a flying drone drops it on
 * the class, is Phase 4 and wants its own ADR.
 */

/** Anything larger is a mistake or a probe, and a school laptop should not find out which. */
const MAX_PACKET_BYTES = 2_048

export interface EspSourceOptions {
  readonly clock: Clock
  /** Which aircraft exist. A packet naming anything else is dropped. */
  readonly registrations: readonly { readonly id: DroneId }[]
  readonly host?: string
  readonly port?: number
}

/** What a packet may say. Everything except `id` is optional, and absent means cannot report. */
interface EspPacket {
  readonly id?: unknown
  readonly battery?: unknown
  readonly height?: unknown
  readonly east?: unknown
  readonly north?: unknown
  readonly airborne?: unknown
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

export class EspTelemetrySource implements TelemetrySource {
  readonly #clock: Clock
  readonly #known: ReadonlySet<string>
  readonly #host: string
  readonly #port: number
  readonly #listeners = new Set<(observation: TelemetryObservation) => void>()

  /**
   * Where each aircraft last spoke from.
   *
   * Phase 4 needs somewhere to send a reply, and an ESP32 on a travel router gets whatever
   * address DHCP felt like. Remembering the sender is the only way to answer one later without
   * asking a Teacher to configure anything.
   */
  readonly #lastSeenFrom = new Map<string, { address: string; port: number }>()

  #socket: Socket | null = null

  constructor(options: EspSourceOptions) {
    this.#clock = options.clock
    this.#known = new Set(options.registrations.map((entry) => entry.id))
    this.#host = options.host ?? '0.0.0.0'
    this.#port = options.port ?? 14_555
  }

  connect(): void {
    if (this.#socket) return
    const socket = createSocket('udp4')
    this.#socket = socket
    /*
     * A socket error must not take the ground station down with it. A classroom full of
     * half-written firmware is the normal case here, not the edge case, and a Teacher losing
     * the board because one aircraft sent nonsense is the failure this whole door exists to
     * avoid.
     */
    socket.on('error', () => {
      /* Nothing to say and nothing to do: the door stays shut until the next connect. */
    })
    socket.on('message', (message, from) => {
      this.ingest(message, { address: from.address, port: from.port })
    })
    socket.bind(this.#port, this.#host)
  }

  disconnect(): void {
    this.#socket?.close()
    this.#socket = null
  }

  onObservation(listener: (observation: TelemetryObservation) => void): Unsubscribe {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  /** Where this aircraft last spoke from, or null. Phase 4 reads this. */
  addressOf(id: string): { address: string; port: number } | null {
    return this.#lastSeenFrom.get(id) ?? null
  }

  /**
   * Feed one datagram, as the socket would.
   *
   * Production traffic arrives through `connect()`; tests call this directly so the suite stays
   * deterministic, which is the same seam the MAVLink source uses.
   */
  ingest(message: Uint8Array | string, from?: { address: string; port: number }): void {
    if (message.length > MAX_PACKET_BYTES) return

    let packet: EspPacket
    try {
      const text = typeof message === 'string' ? message : Buffer.from(message).toString('utf8')
      const parsed: unknown = JSON.parse(text)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return
      packet = parsed as EspPacket
    } catch {
      /* Malformed packets are dropped quietly. Half-written firmware is the normal case. */
      return
    }

    const id = typeof packet.id === 'string' ? packet.id.trim() : ''
    if (id === '') return

    /*
     * **An id the Fleet does not know is not invented into a Drone.** Registration comes from
     * config, the way the ground station registers a set today, so a stray packet from a bench
     * test in the next room cannot add an aircraft to a Teacher's board mid-lesson.
     */
    if (!this.#known.has(id)) return

    if (from) this.#lastSeenFrom.set(id, from)

    /*
     * **Absent means cannot report, and is never a zero.** A drone that cannot measure its
     * height must not be drawn on the ground, and one that cannot measure charge must not read
     * as flat. The contract distinguishes absent from null and the board already says both in
     * words, so the only job here is to not fill anything in.
     *
     * `batteryFraction` and `airborne` are required by the contract and have no absent form, so
     * an aircraft that says nothing about them is treated as on the ground with no charge
     * reading it can vouch for -- and `batteryIsEstimate` is how the board knows not to trust
     * the number it was handed.
     */
    const battery = isFiniteNumber(packet.battery)
      ? Math.min(1, Math.max(0, packet.battery))
      : null
    const east = isFiniteNumber(packet.east) ? packet.east : null
    const north = isFiniteNumber(packet.north) ? packet.north : null

    const observation: TelemetryObservation = {
      droneId: id as DroneId,
      telemetry: {
        batteryFraction: battery ?? 0,
        batteryIsEstimate: battery === null,
        airborne: packet.airborne === true,
        fault: null,
        ...(isFiniteNumber(packet.height) ? { altitudeM: packet.height } : {}),
        ...(east !== null && north !== null ? { position: { eastM: east, northM: north } } : {}),
      },
    }

    for (const listener of this.#listeners) listener(observation)
  }
}
