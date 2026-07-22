import type {
  Clock,
  CommandOutcomeMessage,
  DroneCommand,
  DroneRegistration,
  Unsubscribe,
} from '@techtechflight/contract'
import { FleetHistoryRecorder, GroundStation } from '@techtechflight/fleet-core'
import { CLASSROOM_FLEET, SimulatedTelemetrySource } from '@techtechflight/fleet-core/simulator'
import type { FleetLink, FleetSnapshot, ScenarioControls } from './fleet-link'

/**
 * A Fleet that runs in this browser, with no ground station behind it.
 *
 * The board could always be shown without a server, but what it showed was six hard-coded
 * Drones restamped every couple of seconds. Altitude was a literal, so no Drone ever
 * climbed or descended; charge was a literal, so no endurance was ever forecast; positions
 * were literals, so nothing ever converged. Every derivation the oversight screens exist
 * to perform was invisible on the only build anyone could look at without running Node.
 *
 * So this runs the real thing instead. The same GroundStation the ground station runs, the
 * same ageing into Stale and Offline, the same charge forecast, the same event recorder,
 * fed by the same simulated Telemetry Source — all of which is possible because none of it
 * is Node (ADR-0013).
 *
 * What it produces is a FleetSnapshot indistinguishable from one that arrived over a
 * socket. That is the whole requirement: no screen may be able to tell.
 */

export interface LocalFleetOptions {
  readonly clock: Clock
  /** The classroom set by default. Overridden so a test can pin the Fleet exactly. */
  readonly registrations?: readonly DroneRegistration[]
  readonly reportIntervalMs?: number
  /** Injected so a test can make a run deterministic. */
  readonly random?: () => number
  /** Unprompted take-offs, faults and quiet spells. Off makes a run repeatable. */
  readonly spontaneous?: boolean
}

export class LocalFleetLink implements FleetLink {
  readonly #clock: Clock
  readonly #station: GroundStation
  readonly #history = new FleetHistoryRecorder()
  readonly #simulator: SimulatedTelemetrySource

  #listeners = new Set<(snapshot: FleetSnapshot) => void>()
  #outcomeListeners = new Set<(outcome: CommandOutcomeMessage) => void>()
  #snapshot: FleetSnapshot = { connection: 'connecting', state: null, receivedAt: null }
  #unsubscribe: Unsubscribe | null = null
  #started = false

  constructor(options: LocalFleetOptions) {
    const registrations = options.registrations ?? CLASSROOM_FLEET
    this.#clock = options.clock
    this.#simulator = new SimulatedTelemetrySource({
      registrations,
      clock: options.clock,
      ...(options.reportIntervalMs === undefined
        ? {}
        : { reportIntervalMs: options.reportIntervalMs }),
      ...(options.random === undefined ? {} : { random: options.random }),
      ...(options.spontaneous === undefined ? {} : { spontaneous: options.spontaneous }),
    })
    this.#station = new GroundStation({
      registrations,
      source: this.#simulator,
      clock: options.clock,
    })
  }

  /**
   * The scenario triggers, for the demonstration panel.
   *
   * Deliberately reached through the link rather than by a screen importing the simulator
   * itself. These are not Commands and must never be shown as though they were: asking a
   * Drone to land is a request to an aircraft, and inventing a fault is the world
   * misbehaving. Only the first can exist on real hardware.
   */
  get scenarios(): ScenarioControls {
    return this.#simulator
  }

  get snapshot(): FleetSnapshot {
    return this.#snapshot
  }

  subscribe(listener: (snapshot: FleetSnapshot) => void): Unsubscribe {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  send(command: DroneCommand): void {
    // The same GroundStation method the socket path reaches, so the guard that decides
    // whether a Fleet accepts Commands at all lives in exactly one place.
    const outcome = this.#station.command(command)
    const message: CommandOutcomeMessage = {
      type: 'command-outcome',
      commandId: command.id,
      ...outcome,
    }
    for (const listener of this.#outcomeListeners) listener(message)
  }

  onCommandOutcome(listener: (outcome: CommandOutcomeMessage) => void): Unsubscribe {
    this.#outcomeListeners.add(listener)
    return () => this.#outcomeListeners.delete(listener)
  }

  start(): void {
    if (this.#started) return
    this.#started = true

    /*
     * Seeded from the Fleet as it stands rather than from nothing, so the first real
     * change is a change rather than six Drones apparently springing into existence —
     * the same reason the ground station's own process seeds it this way.
     */
    this.#station.start()
    this.#history.observe(this.#station.fleetState())
    this.#unsubscribe = this.#station.onFleetState((state) => {
      this.#history.observe(state)
      this.#publish(state)
    })

    this.#publish(this.#station.fleetState())
  }

  stop(): void {
    this.#unsubscribe?.()
    this.#unsubscribe = null
    this.#station.stop()
    this.#started = false
  }

  #publish(state: ReturnType<GroundStation['fleetState']>): void {
    // Live from the first moment. There is nothing here to fail to reach, and a browser
    // Fleet that spent a second "connecting" would be inventing a state to look busy.
    this.#snapshot = {
      connection: 'live',
      state,
      receivedAt: this.#clock.now(),
      history: this.#history.history(),
    }
    for (const listener of this.#listeners) listener(this.#snapshot)
  }
}
