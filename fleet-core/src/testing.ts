import type {
  DroneId,
  Telemetry,
  TelemetryObservation,
  TelemetrySource,
  Unsubscribe,
} from '@techtechflight/contract'
import { aTelemetry } from '@techtechflight/contract/fixtures'

/**
 * A Telemetry Source the tests drive by hand.
 *
 * This is what makes seam 1 testable with no hardware and no sockets: the ground
 * station cannot tell this apart from a radio, which is the whole point of ADR-0001.
 */
export class FakeTelemetrySource implements TelemetrySource {
  #listeners = new Set<(observation: TelemetryObservation) => void>()
  connected = false

  connect(): void {
    this.connected = true
  }

  disconnect(): void {
    this.connected = false
  }

  onObservation(listener: (observation: TelemetryObservation) => void): Unsubscribe {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  /** Report Telemetry for one Drone, as a radio would. */
  report(droneId: DroneId, telemetry: Partial<Telemetry> = {}): void {
    const observation: TelemetryObservation = {
      droneId,
      telemetry: aTelemetry(telemetry),
    }
    for (const listener of this.#listeners) listener(observation)
  }
}
