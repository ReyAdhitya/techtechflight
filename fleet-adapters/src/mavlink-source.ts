import type { Clock, TelemetryObservation, TelemetrySource, Unsubscribe } from '@techtechflight/contract'

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

  constructor(options: MavlinkSourceOptions) {
    this.#clock = options.clock
    this.#host = options.host ?? '127.0.0.1'
    this.#port = options.port ?? 14_550
    this.#idForSystem = options.idForSystem ?? ((systemId) => `mav-${systemId}`)
    // Touch the clock so a future reader sees it is required, not decorative.
    void this.#clock
    void this.#host
    void this.#port
    void this.#idForSystem
  }

  connect(): void {
    // Socket wiring lands with the frame parser — this commit only opens the workspace.
  }

  disconnect(): void {}

  onObservation(listener: (observation: TelemetryObservation) => void): Unsubscribe {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }
}
