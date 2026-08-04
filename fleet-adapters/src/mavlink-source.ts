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
  linkQuality?: number
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

    // Match on the registry class, not `instanceof`. SITL traffic and recorded fixtures both
    // decode through the same REGISTRY entries; `instanceof` can fail across package copies.
    const data = packet.protocol.data(packet.payload, clazz) as {
      baseMode?: number
      systemStatus?: number
      batteryRemaining?: number
      voltageBattery?: number
      x?: number
      y?: number
      z?: number
      relativeAlt?: number
      roll?: number
      pitch?: number
      yaw?: number
      rssi?: number
    }
    const systemId = packet.header.sysid
    // Our own GCS heartbeats bounce back on some links; ignore them.
    if (systemId === 255) return

    const draft = this.#craft.get(systemId) ?? emptyDraft()
    let changed = false

    if (clazz === minimal.Heartbeat) {
      draft.armed = ((data.baseMode ?? 0) & minimal.MavModeFlag.SAFETY_ARMED) !== 0
      draft.systemStatus = data.systemStatus ?? minimal.MavState.UNINIT
      changed = true
    } else if (clazz === common.SysStatus) {
      const remaining = data.batteryRemaining ?? -1
      const voltage = data.voltageBattery ?? 0
      if (remaining >= 0) {
        draft.batteryFraction = clamp01(remaining / 100)
        draft.batteryIsEstimate = false
        changed = true
      } else if (voltage > 0 && voltage < 65_535) {
        // Millivolts; a 3S pack at rest is roughly 12.6 V. Estimate only when remaining is
        // unavailable — the board marks estimates so a Teacher does not over-trust them.
        draft.batteryFraction = clamp01(voltage / 1_000 / 12.6)
        draft.batteryIsEstimate = true
        changed = true
      }
    } else if (clazz === common.BatteryStatus) {
      const remaining = data.batteryRemaining ?? -1
      if (remaining >= 0) {
        draft.batteryFraction = clamp01(remaining / 100)
        draft.batteryIsEstimate = false
        changed = true
      }
    } else if (clazz === common.LocalPositionNed) {
      // NED: x north, y east, z down. Height above the takeoff point is −z.
      draft.northM = round1(data.x ?? 0)
      draft.eastM = round1(data.y ?? 0)
      draft.altitudeM = round1(-(data.z ?? 0))
      changed = true
    } else if (clazz === common.GlobalPositionInt) {
      draft.altitudeM = round1((data.relativeAlt ?? 0) / 1_000)
      changed = true
    } else if (clazz === common.RadioStatus) {
      /*
       * How well the radio is carrying, which is a different fact from when we last heard
       * anything. RADIO_STATUS comes from the *radio*, not the aircraft, so it arrives
       * without a system id we can attribute — it describes the link this ground station
       * holds, and every craft on that link shares it.
       *
       * `rssi` is 0..254 on a SiK-style link. Scaled to a proportion here rather than on
       * a screen, because the contract's rule is that a reading reaches the board already
       * in the units a Teacher can read.
       */
      draft.linkQuality = round2(clamp01((data.rssi ?? 0) / 254))
      changed = true
    } else if (clazz === common.Attitude) {
      draft.orientation = {
        rollDegrees: round1(radToDeg(data.roll ?? 0)),
        pitchDegrees: round1(radToDeg(data.pitch ?? 0)),
        yawDegrees: round1(wrapDegrees(radToDeg(data.yaw ?? 0))),
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
 * Charge is required on `Telemetry`, but some links (notably older ArduPilot SITL) emit
 * HEARTBEAT / position with `batteryRemaining = -1` and no voltage. Staying silent then
 * makes a heartbeating craft read as Offline. Emit with an estimated full pack marked
 * `batteryIsEstimate` until a real remaining or voltage arrives.
 */
function toTelemetry(draft: CraftDraft): Telemetry | null {
  const contacted =
    draft.systemStatus !== minimal.MavState.UNINIT ||
    draft.altitudeM !== undefined ||
    draft.batteryFraction !== null
  if (!contacted) return null

  const batteryFraction = draft.batteryFraction ?? 1
  const batteryIsEstimate = draft.batteryFraction === null ? true : draft.batteryIsEstimate

  const airborne =
    draft.altitudeM !== undefined ? draft.altitudeM > 0.1 : draft.armed

  const telemetry: Telemetry = {
    batteryFraction,
    batteryIsEstimate,
    airborne,
    fault: faultFrom(draft.systemStatus),
  }

  /*
   * Spread only the keys this link actually reported. A key present and undefined is not
   * the same as an absent key under `exactOptionalPropertyTypes`, and the board reads
   * absent as "this craft cannot report it at all" — which is exactly what a link with no
   * RADIO_STATUS means about signal strength.
   */
  return withOptional(telemetry, {
    ...(draft.altitudeM !== undefined ? { altitudeM: draft.altitudeM } : {}),
    ...(draft.altitudeM !== undefined && draft.eastM !== undefined && draft.northM !== undefined
      ? { position: { eastM: draft.eastM, northM: draft.northM } }
      : {}),
    ...(draft.orientation ? { orientation: draft.orientation } : {}),
    ...(draft.linkQuality !== undefined ? { linkQuality: draft.linkQuality } : {}),
  })
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

function round2(value: number): number {
  return Number(value.toFixed(2))
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
