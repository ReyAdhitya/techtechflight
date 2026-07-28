import { createSocket, type Socket } from 'node:dgram'
import { PassThrough } from 'node:stream'
import type {
  Clock,
  FaultReport,
  Orientation,
  Telemetry,
  TelemetryObservation,
  TelemetrySource,
  Unsubscribe,
} from '@techtechflight/contract'
import {
  MavLinkPacketParser,
  MavLinkPacketSplitter,
  MavLinkProtocolV2,
  common,
  minimal,
  send,
  type MavLinkPacket,
  type MavLinkPacketRegistry,
} from 'node-mavlink'

const REGISTRY: MavLinkPacketRegistry = {
  ...minimal.REGISTRY,
  ...common.REGISTRY,
}

/** GCS heartbeats keep ArduPilot SITL talking once a listener binds the port. */
const GCS_HEARTBEAT_MS = 1_000

/**
 * Options for reading Drones over MAVLink.
 *
 * The simulator stays the default at the ground station. This source is opted into when a
 * School points the station at a UDP port that carries real MAVLink — ArduPilot SITL on
 * `127.0.0.1:14550` during development, a radio link later.
 */
export interface MavlinkSourceOptions {
  readonly clock: Clock
  /** UDP host to bind. Defaults to `127.0.0.1`. */
  readonly host?: string
  /** UDP port to bind. Defaults to `14550` (ArduPilot SITL's usual GCS port). */
  readonly port?: number
  /**
   * How a MAVLink system id becomes a Drone id the rest of the board already knows.
   * Defaults to `mav-${systemId}`.
   */
  readonly idForSystem?: (systemId: number) => string
}

type CraftDraft = {
  armed: boolean
  systemStatus: number
  batteryFraction: number | null
  batteryIsEstimate: boolean
  altitudeM?: number
  eastM?: number
  northM?: number
  orientation?: Orientation
}

/**
 * A read-only Telemetry Source that speaks MAVLink over UDP.
 *
 * It implements `TelemetrySource` and deliberately does **not** implement
 * `CommandableSource` (ADR-0011). Against real hardware this is monitoring, not control —
 * Land, Hold and Emergency Stop stay present-and-unavailable on the board.
 *
 * Fresh `Telemetry` objects only: the ground station keeps the object it is handed and
 * compares Fleet States by that reference (`fleet-core/src/telemetry-ownership.test.ts`).
 * A single reused buffer would silently rewrite every published Fleet State.
 *
 * Time comes from the injected `Clock`. Global timers are never consulted.
 */
export class MavlinkTelemetrySource implements TelemetrySource {
  readonly #clock: Clock
  readonly #host: string
  readonly #port: number
  readonly #idForSystem: (systemId: number) => string
  readonly #listeners = new Set<(observation: TelemetryObservation) => void>()
  readonly #craft = new Map<number, CraftDraft>()
  readonly #parser = new PassThrough()

  #socket: Socket | null = null
  #cancelHeartbeat: Unsubscribe | null = null
  #remote: { address: string; port: number } | null = null

  constructor(options: MavlinkSourceOptions) {
    this.#clock = options.clock
    this.#host = options.host ?? '127.0.0.1'
    this.#port = options.port ?? 14_550
    this.#idForSystem = options.idForSystem ?? ((systemId) => `mav-${systemId}`)

    const reader = this.#parser
      .pipe(new MavLinkPacketSplitter())
      .pipe(new MavLinkPacketParser())
    reader.on('data', (packet: MavLinkPacket) => this.#onPacket(packet))
  }

  connect(): void {
    if (this.#socket) return

    const socket = createSocket('udp4')
    this.#socket = socket
    socket.on('message', (msg, rinfo) => {
      this.#remote = { address: rinfo.address, port: rinfo.port }
      this.ingest(msg)
    })
    socket.bind(this.#port, this.#host)

    // SITL (and many radios) wait for a GCS heartbeat before they stream Telemetry.
    this.#cancelHeartbeat = this.#clock.setInterval(() => {
      void this.#sendGcsHeartbeat()
    }, GCS_HEARTBEAT_MS)
  }

  disconnect(): void {
    this.#cancelHeartbeat?.()
    this.#cancelHeartbeat = null
    this.#socket?.close()
    this.#socket = null
    this.#remote = null
  }

  onObservation(listener: (observation: TelemetryObservation) => void): Unsubscribe {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  /**
   * Feed raw MAVLink bytes as a UDP datagram would.
   *
   * Production traffic arrives through `connect()`; tests call this with recorded frames
   * so the suite stays deterministic — no socket, no sleeps.
   */
  ingest(bytes: Uint8Array): void {
    this.#parser.write(Buffer.from(bytes))
  }

  #onPacket(packet: MavLinkPacket): void {
    const clazz = REGISTRY[packet.header.msgid]
    if (!clazz) return

    const data = packet.protocol.data(packet.payload, clazz)
    const systemId = packet.header.sysid
    // Our own GCS heartbeats bounce back on some links; ignore them.
    if (systemId === 255) return

    const draft = this.#craft.get(systemId) ?? emptyDraft()
    let changed = false

    if (data instanceof minimal.Heartbeat) {
      draft.armed = (data.baseMode & minimal.MavModeFlag.SAFETY_ARMED) !== 0
      draft.systemStatus = data.systemStatus
      changed = true
    } else if (data instanceof common.SysStatus) {
      if (data.batteryRemaining >= 0) {
        draft.batteryFraction = clamp01(data.batteryRemaining / 100)
        draft.batteryIsEstimate = false
        changed = true
      } else if (data.voltageBattery > 0 && data.voltageBattery < 65_535) {
        // Millivolts; a 3S pack at rest is roughly 12.6 V. Estimate only when remaining is
        // unavailable — the board marks estimates so a Teacher does not over-trust them.
        draft.batteryFraction = clamp01(data.voltageBattery / 1_000 / 12.6)
        draft.batteryIsEstimate = true
        changed = true
      }
    } else if (data instanceof common.BatteryStatus) {
      if (data.batteryRemaining >= 0) {
        draft.batteryFraction = clamp01(data.batteryRemaining / 100)
        draft.batteryIsEstimate = false
        changed = true
      }
    } else if (data instanceof common.LocalPositionNed) {
      // NED: x north, y east, z down. Height above the takeoff point is −z.
      draft.northM = round1(data.x)
      draft.eastM = round1(data.y)
      draft.altitudeM = round1(-data.z)
      changed = true
    } else if (data instanceof common.GlobalPositionInt) {
      draft.altitudeM = round1(data.relativeAlt / 1_000)
      changed = true
    } else if (data instanceof common.Attitude) {
      draft.orientation = {
        rollDegrees: round1(radToDeg(data.roll)),
        pitchDegrees: round1(radToDeg(data.pitch)),
        yawDegrees: round1(wrapDegrees(radToDeg(data.yaw))),
      }
      changed = true
    }

    if (!changed) return
    this.#craft.set(systemId, draft)

    const telemetry = toTelemetry(draft)
    if (!telemetry) return

    const observation: TelemetryObservation = {
      droneId: this.#idForSystem(systemId),
      telemetry,
    }
    for (const listener of this.#listeners) listener(observation)
  }

  async #sendGcsHeartbeat(): Promise<void> {
    if (!this.#socket || !this.#remote) return

    const heartbeat = new minimal.Heartbeat()
    heartbeat.type = minimal.MavType.GCS
    heartbeat.autopilot = minimal.MavAutopilot.INVALID
    // A GCS is never armed; the enum has no zero member, so the empty flag set is cast.
    heartbeat.baseMode = 0 as minimal.MavModeFlag
    heartbeat.customMode = 0
    heartbeat.systemStatus = minimal.MavState.ACTIVE
    heartbeat.mavlinkVersion = 3

    const sink = new PassThrough()
    const chunks: Buffer[] = []
    sink.on('data', (chunk: Buffer) => chunks.push(chunk))
    await send(sink, heartbeat, new MavLinkProtocolV2(255, 190))
    const payload = Buffer.concat(chunks)
    this.#socket.send(payload, this.#remote.port, this.#remote.address)
  }
}

function emptyDraft(): CraftDraft {
  return {
    armed: false,
    systemStatus: minimal.MavState.UNINIT,
    batteryFraction: null,
    batteryIsEstimate: false,
  }
}

/**
 * Build a fresh Telemetry object from the accumulated craft draft.
 *
 * Returns null until battery is known — every other field is optional on `Telemetry`, but
 * charge is not, and inventing 0% would show a flat pack the aircraft never reported.
 */
function toTelemetry(draft: CraftDraft): Telemetry | null {
  if (draft.batteryFraction === null) return null

  const airborne =
    draft.altitudeM !== undefined ? draft.altitudeM > 0.1 : draft.armed

  const telemetry: Telemetry = {
    batteryFraction: draft.batteryFraction,
    batteryIsEstimate: draft.batteryIsEstimate,
    airborne,
    fault: faultFrom(draft.systemStatus),
  }

  if (draft.altitudeM !== undefined) {
    return withOptional(telemetry, {
      altitudeM: draft.altitudeM,
      ...(draft.eastM !== undefined && draft.northM !== undefined
        ? { position: { eastM: draft.eastM, northM: draft.northM } }
        : {}),
      ...(draft.orientation ? { orientation: draft.orientation } : {}),
    })
  }

  if (draft.orientation) {
    return withOptional(telemetry, { orientation: draft.orientation })
  }

  return telemetry
}

function withOptional(base: Telemetry, extra: Partial<Telemetry>): Telemetry {
  return { ...base, ...extra }
}

function faultFrom(systemStatus: number): FaultReport | null {
  if (
    systemStatus === minimal.MavState.CRITICAL ||
    systemStatus === minimal.MavState.EMERGENCY
  ) {
    return {
      code: 'MAV_STATE',
      description:
        systemStatus === minimal.MavState.EMERGENCY
          ? 'Autopilot reports an emergency'
          : 'Autopilot reports a critical condition',
    }
  }
  return null
}

function clamp01(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI
}

function wrapDegrees(degrees: number): number {
  const wrapped = ((degrees % 360) + 360) % 360
  return wrapped
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}
