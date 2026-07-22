import type {
  Clock,
  DroneRegistration,
  DroneState,
  FleetState,
  FleetThresholds,
  Telemetry,
  TelemetrySource,
  Unsubscribe,
} from '@techtechflight/contract'
import { DEFAULT_THRESHOLDS } from '@techtechflight/contract'
import {
  DEFAULT_CHARGE_FORECAST,
  forecastTimeToReady,
  recordCharge,
  type ChargeForecastOptions,
  type ChargeSample,
} from './charge.ts'
import { deriveStatus, isStale } from './status.ts'

export interface GroundStationOptions {
  /** Every Drone the School owns, responded or not. */
  readonly registrations: readonly DroneRegistration[]
  readonly source: TelemetrySource
  readonly clock: Clock
  readonly thresholds?: FleetThresholds
  /**
   * How often to re-check ageing. Silence is not an event, so something has to look at
   * the clock for a Drone to fall out of contact on its own.
   */
  readonly tickIntervalMs?: number
  /** How much observed charge is enough to forecast from. See `charge.ts`. */
  readonly chargeForecast?: ChargeForecastOptions
}

interface DroneRecord {
  readonly registration: DroneRegistration
  telemetry: Telemetry | null
  lastContact: number | null
  /** Recent battery readings, kept only to tell charge going in from sensor noise. */
  charge: readonly ChargeSample[]
}

/**
 * Owns the Fleet registry, derives Status, ages Telemetry into Stale and then Offline,
 * and publishes Fleet State.
 *
 * It knows nothing about sockets — this class is the whole of seam 1, and the server
 * around it is a transport detail.
 */
export class GroundStation {
  readonly #records: readonly DroneRecord[]
  readonly #source: TelemetrySource
  readonly #clock: Clock
  readonly #thresholds: FleetThresholds
  readonly #tickIntervalMs: number
  readonly #chargeForecast: ChargeForecastOptions

  #listeners = new Set<(state: FleetState) => void>()
  #unsubscribeSource: Unsubscribe | null = null
  #cancelTick: Unsubscribe | null = null
  #lastPublished: readonly DroneState[] | null = null

  constructor(options: GroundStationOptions) {
    this.#source = options.source
    this.#clock = options.clock
    this.#thresholds = options.thresholds ?? DEFAULT_THRESHOLDS
    this.#tickIntervalMs = options.tickIntervalMs ?? 1_000
    this.#chargeForecast = options.chargeForecast ?? DEFAULT_CHARGE_FORECAST
    this.#records = [...options.registrations]
      .sort((a, b) => a.boardOrder - b.boardOrder)
      .map((registration) => ({
        registration,
        telemetry: null,
        lastContact: null,
        charge: [],
      }))
  }

  start(): void {
    if (this.#unsubscribeSource) return

    this.#unsubscribeSource = this.#source.onObservation((observation) => {
      const record = this.#records.find(
        (candidate) => candidate.registration.id === observation.droneId,
      )
      // Telemetry from a Drone the School does not own is dropped rather than
      // conjuring a tile for something the Teacher cannot find in the cupboard.
      if (!record) return

      const at = this.#clock.now()
      record.telemetry = observation.telemetry
      record.lastContact = at
      record.charge = recordCharge(
        record.charge,
        { at, batteryFraction: observation.telemetry.batteryFraction },
        this.#chargeForecast,
      )
      this.#publishIfChanged()
    })

    this.#cancelTick = this.#clock.setInterval(() => {
      this.#publishIfChanged()
    }, this.#tickIntervalMs)

    void this.#source.connect()
    this.#lastPublished = this.fleetState().drones
  }

  stop(): void {
    this.#unsubscribeSource?.()
    this.#unsubscribeSource = null
    this.#cancelTick?.()
    this.#cancelTick = null
    void this.#source.disconnect()
  }

  /** The current snapshot. Complete, so a dashboard opening now is immediately right. */
  fleetState(): FleetState {
    const now = this.#clock.now()
    return {
      generatedAt: now,
      drones: this.#records.map((record) => this.#droneState(record, now)),
    }
  }

  onFleetState(listener: (state: FleetState) => void): Unsubscribe {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  #droneState(record: DroneRecord, now: number): DroneState {
    const ageing = {
      telemetry: record.telemetry,
      lastContact: record.lastContact,
      now,
      thresholds: this.#thresholds,
    }
    const status = deriveStatus(ageing)
    return {
      id: record.registration.id,
      name: record.registration.name,
      status,
      telemetry: record.telemetry,
      lastContact: record.lastContact,
      stale: isStale(ageing),
      /*
       * Only Not Ready carries a forecast. It is the one Status the glossary defines as
       * expected to resolve, so it is the only one where "when" is a question a Teacher
       * is asking. A Ready Drone has already arrived, a Flying one is in use, a Fault
       * needs a person rather than time, and an Offline one is not being observed at
       * all — a countdown on any of them would be answering something nobody asked.
       */
      timeToReadyMs:
        status === 'Not Ready'
          ? forecastTimeToReady(record.charge, this.#thresholds, this.#chargeForecast)
          : null,
    }
  }

  #publishIfChanged(): void {
    const state = this.fleetState()
    if (this.#lastPublished && sameFleet(this.#lastPublished, state.drones)) return

    this.#lastPublished = state.drones
    for (const listener of this.#listeners) listener(state)
  }
}

/**
 * Compared field by field rather than by serialising, so that key ordering in Telemetry
 * coming off a Telemetry Source can never masquerade as a change.
 */
function sameFleet(before: readonly DroneState[], after: readonly DroneState[]): boolean {
  if (before.length !== after.length) return false
  return before.every((drone, index) => {
    const other = after[index]!
    return (
      drone.id === other.id &&
      drone.status === other.status &&
      drone.lastContact === other.lastContact &&
      drone.stale === other.stale &&
      drone.telemetry === other.telemetry &&
      // Quantised to the displayed minute upstream, so this compares what a Teacher
      // would see rather than republishing the Fleet on every recalculation.
      drone.timeToReadyMs === other.timeToReadyMs
    )
  })
}
