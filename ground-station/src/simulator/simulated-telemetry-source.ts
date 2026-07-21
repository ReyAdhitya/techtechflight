import type {
  Clock,
  DroneId,
  DroneRegistration,
  FaultReport,
  TelemetryObservation,
  TelemetrySource,
  Unsubscribe,
} from '@techtechflight/contract'

/**
 * A Fleet of simulated Drones.
 *
 * Per ADR-0001 this is a first-class Telemetry Source that ships, not scaffolding to be
 * deleted when hardware arrives. Drones are expensive, slow to charge, and cannot be
 * flown at a desk, so we will want to develop, test, and demonstrate against this for
 * the life of the product.
 *
 * It reports observations and nothing else. It has no opinion about Status.
 */
export class SimulatedTelemetrySource implements TelemetrySource {
  readonly #drones: Map<DroneId, SimulatedDrone>
  readonly #clock: Clock
  readonly #reportIntervalMs: number
  readonly #random: () => number
  readonly #idleDrainPerMinute: number
  readonly #flyingDrainPerMinute: number
  readonly #spontaneous: boolean

  #listeners = new Set<(observation: TelemetryObservation) => void>()
  #cancelTick: Unsubscribe | null = null

  constructor(options: SimulatorOptions) {
    this.#clock = options.clock
    this.#reportIntervalMs = options.reportIntervalMs ?? 1_000
    this.#random = options.random ?? Math.random
    this.#idleDrainPerMinute = options.idleDrainPerMinute ?? 0.004
    this.#flyingDrainPerMinute = options.flyingDrainPerMinute ?? 0.06
    this.#spontaneous = options.spontaneous ?? true

    this.#drones = new Map(
      options.registrations.map((registration, index) => [
        registration.id,
        {
          registration,
          batteryFraction: 0.45 + this.#random() * 0.5,
          // Not every airframe can measure charge precisely. Alternating them means a
          // demo always has one of each on screen.
          batteryIsEstimate: index % 3 === 1,
          airborne: false,
          fault: null,
          linkUp: true,
        },
      ]),
    )
  }

  connect(): void {
    if (this.#cancelTick) return
    this.#cancelTick = this.#clock.setInterval(() => this.#tick(), this.#reportIntervalMs)
  }

  disconnect(): void {
    this.#cancelTick?.()
    this.#cancelTick = null
  }

  onObservation(listener: (observation: TelemetryObservation) => void): Unsubscribe {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  // --- Scenario triggers -------------------------------------------------------
  // So a Fault or a lost link can be shown during a demonstration without waiting
  // for one to happen on its own.

  /** Take this Drone off the air. It falls silent, and will age to Offline. */
  loseLink(droneId: DroneId): void {
    this.#drone(droneId).linkUp = false
  }

  restoreLink(droneId: DroneId): void {
    this.#drone(droneId).linkUp = true
  }

  injectFault(droneId: DroneId, fault: FaultReport = DEFAULT_FAULT): void {
    this.#drone(droneId).fault = fault
  }

  clearFault(droneId: DroneId): void {
    this.#drone(droneId).fault = null
  }

  takeOff(droneId: DroneId): void {
    this.#drone(droneId).airborne = true
  }

  land(droneId: DroneId): void {
    this.#drone(droneId).airborne = false
  }

  /** Put a Drone at a chosen charge, to show Not Ready without waiting for a drain. */
  setBattery(droneId: DroneId, fraction: number): void {
    this.#drone(droneId).batteryFraction = clamp(fraction)
  }

  #drone(droneId: DroneId): SimulatedDrone {
    const drone = this.#drones.get(droneId)
    if (!drone) throw new Error(`The simulator has no Drone ${droneId}`)
    return drone
  }

  #tick(): void {
    for (const drone of this.#drones.values()) {
      if (this.#spontaneous) this.#wander(drone)

      // A Drone off the air reports nothing at all. Silence is the absence of
      // observations, never an observation saying "I am silent".
      if (!drone.linkUp) continue

      const drainPerMinute = drone.airborne
        ? this.#flyingDrainPerMinute
        : this.#idleDrainPerMinute
      drone.batteryFraction = clamp(
        drone.batteryFraction - (drainPerMinute * this.#reportIntervalMs) / 60_000,
      )

      // A flat battery brings a Drone down.
      if (drone.airborne && drone.batteryFraction <= 0.05) drone.airborne = false

      this.#emit(drone)
    }
  }

  /** Occasional unprompted behaviour, so a long demo is not a straight line. */
  #wander(drone: SimulatedDrone): void {
    const roll = this.#random()
    if (!drone.linkUp) {
      if (roll < 0.05) drone.linkUp = true
      return
    }
    if (roll < 0.002) drone.linkUp = false
    else if (roll < 0.004 && drone.fault === null) drone.fault = DEFAULT_FAULT
    else if (roll < 0.01 && !drone.airborne && drone.batteryFraction > 0.4) {
      drone.airborne = true
    } else if (roll < 0.02 && drone.airborne) drone.airborne = false
  }

  #emit(drone: SimulatedDrone): void {
    const observation: TelemetryObservation = {
      droneId: drone.registration.id,
      telemetry: {
        batteryFraction: round(drone.batteryFraction),
        batteryIsEstimate: drone.batteryIsEstimate,
        airborne: drone.airborne,
        fault: drone.fault,
        extra: {
          motorTemperatureC: round(28 + (drone.airborne ? 14 : 0) + this.#random() * 4, 1),
          satellitesVisible: Math.round(6 + this.#random() * 6),
          firmware: '1.4.2',
        },
      },
    }
    for (const listener of this.#listeners) listener(observation)
  }
}

export interface SimulatorOptions {
  readonly registrations: readonly DroneRegistration[]
  readonly clock: Clock
  readonly reportIntervalMs?: number
  /** Injected so a test can pin the Fleet's behaviour exactly. */
  readonly random?: () => number
  readonly idleDrainPerMinute?: number
  readonly flyingDrainPerMinute?: number
  /** Unprompted take-offs, faults, and quiet spells. Off makes a run deterministic. */
  readonly spontaneous?: boolean
}

interface SimulatedDrone {
  readonly registration: DroneRegistration
  batteryFraction: number
  batteryIsEstimate: boolean
  airborne: boolean
  fault: FaultReport | null
  linkUp: boolean
}

const DEFAULT_FAULT: FaultReport = {
  code: 'IMU_CALIBRATION',
  description: 'Motion sensor needs recalibrating',
}

const clamp = (value: number) => Math.min(1, Math.max(0, value))
const round = (value: number, places = 3) => Number(value.toFixed(places))
