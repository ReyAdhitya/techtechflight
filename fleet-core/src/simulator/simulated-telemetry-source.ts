import type {
  AutoLandingState,
  Clock,
  CommandableSource,
  DroneCommand,
  DroneId,
  DroneRegistration,
  FaultReport,
  MotorReading,
  ProximityReading,
  Telemetry,
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
export class SimulatedTelemetrySource implements TelemetrySource, CommandableSource {
  readonly #drones: Map<DroneId, SimulatedDrone>
  readonly #clock: Clock
  readonly #reportIntervalMs: number
  readonly #random: () => number
  readonly #idleDrainPerMinute: number
  readonly #flyingDrainPerMinute: number
  readonly #chargePerMinute: number
  readonly #spontaneous: boolean

  #listeners = new Set<(observation: TelemetryObservation) => void>()
  #cancelTick: Unsubscribe | null = null

  constructor(options: SimulatorOptions) {
    this.#clock = options.clock
    this.#reportIntervalMs = options.reportIntervalMs ?? 1_000
    this.#random = options.random ?? Math.random
    this.#idleDrainPerMinute = options.idleDrainPerMinute ?? 0.004
    this.#flyingDrainPerMinute = options.flyingDrainPerMinute ?? 0.06
    this.#chargePerMinute = options.chargePerMinute ?? 0.03
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
          charging: false,

          /*
           * Capabilities differ across a real classroom set — schools buy in batches and
           * batches differ. Varying them here is what keeps the board honest about the
           * difference between "no sensor" and "sensor sees nothing": if every simulated
           * Drone had every sensor, the one case the display has to get right would never
           * appear in a demonstration.
           */
          hasRangefinder: index % 3 !== 2,
          hasCamera: index % 2 === 0,
          canAutoLand: index % 4 !== 3,

          // Parked in a row on the bench, a metre apart, the way a set is laid out.
          homeEastM: index * 1,
          homeNorthM: 0,
          eastM: index * 1,
          northM: 0,
          altitudeM: 0,
          targetAltitudeM: 0,
          yawDegrees: round(this.#random() * 360, 1),
          pitchDegrees: 0,
          rollDegrees: 0,
          emergencyStopTriggered: false,
          autoLanding: false,
          streaming: false,
          linkGroupId: null,
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

  /**
   * Carry out something the Teacher has asked for.
   *
   * This method, and the interface it satisfies, is the entire reason a Command can reach
   * a Fleet at all (ADR-0011). A hardware Telemetry Source does not implement it, so a
   * hardware Fleet refuses Commands structurally rather than by remembering to.
   *
   * Every one of these takes energy out of the aircraft. There is no case here that makes
   * a Drone do more than it is already doing.
   */
  command(command: DroneCommand): void {
    // A Command for a Drone this Fleet does not have is dropped, the same way Telemetry
    // from one is — rather than throwing at whatever asked.
    if (!this.#drones.has(command.droneId)) return

    switch (command.kind) {
      case 'land':
        this.land(command.droneId)
        return
      case 'hold':
        this.hold(command.droneId)
        return
      case 'auto-land':
        this.beginAutoLanding(command.droneId)
        return
      case 'emergency-stop':
        this.triggerEmergencyStop(command.droneId)
        return
    }
  }

  /**
   * Stop going anywhere vertically and stay at this height.
   *
   * The one Command with no existing behaviour behind it. A Drone climbing toward two
   * metres that is asked to hold stays where it is rather than finishing the climb, which
   * is what a Teacher means when a Student has taken it up faster than they meant to.
   */
  hold(droneId: DroneId): void {
    const drone = this.#drone(droneId)
    if (!drone.airborne) return
    drone.autoLanding = false
    drone.targetAltitudeM = drone.altitudeM
  }

  // --- Scenario triggers -------------------------------------------------------
  // So a Fault or a lost link can be shown during a demonstration without waiting
  // for one to happen on its own. These are NOT Commands and must never be offered as
  // though they were: asking a Drone to land is a request to an aircraft, and inventing a
  // fault is the world misbehaving. Only the first can exist on real hardware.

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
    const drone = this.#drone(droneId)
    // A cut Drone stays on the ground until someone has been to it.
    if (drone.emergencyStopTriggered) return
    // Nothing takes off on a charger.
    drone.charging = false
    drone.airborne = true
    drone.targetAltitudeM = round(1.5 + this.#random() * 2, 2)
  }

  /**
   * Latch the emergency cut-out.
   *
   * Deliberately sticky: it stays true until `resetEmergencyStop`, because the physical
   * thing it models is a button someone has to walk over and release. A cut that cleared
   * itself after a second would let a Drone quietly rejoin the lesson.
   */
  triggerEmergencyStop(droneId: DroneId): void {
    const drone = this.#drone(droneId)
    drone.emergencyStopTriggered = true
    drone.airborne = false
    drone.autoLanding = false
    drone.targetAltitudeM = 0
  }

  resetEmergencyStop(droneId: DroneId): void {
    this.#drone(droneId).emergencyStopTriggered = false
  }

  /** Ask the Drone to bring itself down. Ignored by an airframe that cannot. */
  beginAutoLanding(droneId: DroneId): void {
    const drone = this.#drone(droneId)
    if (!drone.canAutoLand || !drone.airborne) return
    drone.autoLanding = true
    drone.targetAltitudeM = 0
  }

  startCamera(droneId: DroneId): void {
    const drone = this.#drone(droneId)
    if (drone.hasCamera) drone.streaming = true
  }

  stopCamera(droneId: DroneId): void {
    this.#drone(droneId).streaming = false
  }

  /** Fly these Drones as one linked group, so the board can show the formation. */
  link(droneIds: readonly DroneId[], groupId = 'group-a'): void {
    for (const droneId of droneIds) this.#drone(droneId).linkGroupId = groupId
  }

  unlink(droneId: DroneId): void {
    this.#drone(droneId).linkGroupId = null
  }

  /** Put this Drone on charge, so its battery climbs back rather than only draining. */
  plugIn(droneId: DroneId): void {
    const drone = this.#drone(droneId)
    if (drone.airborne) return
    drone.charging = true
  }

  unplug(droneId: DroneId): void {
    this.#drone(droneId).charging = false
  }

  land(droneId: DroneId): void {
    const drone = this.#drone(droneId)
    drone.airborne = false
    drone.autoLanding = false
    drone.targetAltitudeM = 0
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

      /*
       * Charge going in is a gradual climb, at a rate a real pack would manage rather
       * than one that makes a demonstration quick. The forecast downstream is only
       * worth anything if what it is extrapolating from behaves like the real thing.
       */
      if (drone.charging && !drone.airborne) {
        drone.batteryFraction = clamp(
          drone.batteryFraction + (this.#chargePerMinute * this.#reportIntervalMs) / 60_000,
        )
        if (drone.batteryFraction >= FULLY_CHARGED) drone.charging = false
      } else {
        const drainPerMinute = drone.airborne
          ? this.#flyingDrainPerMinute
          : this.#idleDrainPerMinute
        drone.batteryFraction = clamp(
          drone.batteryFraction - (drainPerMinute * this.#reportIntervalMs) / 60_000,
        )

        // A flat battery brings a Drone down.
        if (drone.airborne && drone.batteryFraction <= 0.05) this.land(drone.registration.id)
      }

      this.#fly(drone)
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
      /*
       * Through `takeOff` rather than by setting `airborne` directly. Setting the flag
       * alone left `targetAltitudeM` at zero, so a Drone that took off on its own was
       * reported as Flying while its altitude sat at 0 m forever — the board dutifully
       * said "Flying" and "On the ground" at the same time.
       */
      this.takeOff(drone.registration.id)
    } else if (roll < 0.02 && drone.airborne) this.land(drone.registration.id)

    /*
     * A flat Drone on the bench is the one a Teacher plugs in, so the simulated Fleet
     * recovers the way a real classroom does. Without this the only direction a battery
     * could ever move was down, and a long demonstration ended with six dead Drones and
     * no way back — which is neither realistic nor much of a demonstration.
     */
    if (!drone.airborne && !drone.charging && drone.batteryFraction < 0.25 && roll < 0.05) {
      drone.charging = true
    }
  }

  /**
   * Move the aircraft for one interval.
   *
   * Altitude is chased toward a target rather than snapped, so a Drone climbing, hovering
   * and descending are three distinguishable things on the board rather than one boolean.
   * A cut Drone comes down several times faster than it went up — the motors have stopped.
   */
  #fly(drone: SimulatedDrone): void {
    const seconds = this.#reportIntervalMs / 1_000

    if (drone.emergencyStopTriggered || drone.autoLanding) drone.targetAltitudeM = 0

    const climbRate = drone.emergencyStopTriggered ? 4 : 0.8
    const remaining = drone.targetAltitudeM - drone.altitudeM
    const step = Math.sign(remaining) * Math.min(Math.abs(remaining), climbRate * seconds)
    drone.altitudeM = round(Math.max(0, drone.altitudeM + step), 2)

    // Down and settled: the auto-landing has finished, whoever asked for it.
    if (drone.altitudeM === 0 && drone.targetAltitudeM === 0) drone.autoLanding = false

    if (drone.airborne) {
      const driftEast = (this.#random() - 0.5) * 0.6
      const driftNorth = (this.#random() - 0.5) * 0.6
      drone.eastM = round(clampTo(drone.eastM + driftEast, ROOM.westM, ROOM.eastM), 2)
      drone.northM = round(clampTo(drone.northM + driftNorth, ROOM.southM, ROOM.northM), 2)
      // A multirotor leans in the direction it is travelling. Small angles — this is a
      // classroom, not a race.
      drone.pitchDegrees = round(clampTo(driftNorth * 25, -20, 20), 1)
      drone.rollDegrees = round(clampTo(driftEast * 25, -20, 20), 1)
      drone.yawDegrees = round(((drone.yawDegrees + (this.#random() - 0.5) * 12) % 360 + 360) % 360, 1)
    } else if (drone.altitudeM === 0) {
      // Back on the bench, level, where the Teacher left it.
      drone.eastM = drone.homeEastM
      drone.northM = drone.homeNorthM
      drone.pitchDegrees = 0
      drone.rollDegrees = 0
    } else {
      // Still coming down. It keeps its place in the room and levels out on the way.
      drone.pitchDegrees = round(drone.pitchDegrees * 0.6, 1)
      drone.rollDegrees = round(drone.rollDegrees * 0.6, 1)
    }
  }

  /**
   * Thrust per motor, derived from what the airframe is doing rather than invented.
   *
   * A Teacher looking at four bars wants them to mean something: leaning right really
   * does make the left pair work harder, and a cut Drone really does read zero across
   * the board. Numbers that merely wiggled would be decoration on a safety panel.
   */
  #motors(drone: SimulatedDrone): readonly MotorReading[] {
    const airborne = drone.altitudeM > 0 || drone.airborne
    const climbing = drone.targetAltitudeM > drone.altitudeM
    const base = drone.emergencyStopTriggered || !airborne ? 0 : climbing ? 0.62 : 0.48

    const roll = base === 0 ? 0 : drone.rollDegrees / 90
    const pitch = base === 0 ? 0 : drone.pitchDegrees / 90

    const corners: readonly (readonly [string, number, number])[] = [
      ['front-left', -pitch, +roll],
      ['front-right', -pitch, -roll],
      ['rear-left', +pitch, +roll],
      ['rear-right', +pitch, -roll],
    ]

    return corners.map(([id, pitchTerm, rollTerm]) => ({
      id,
      thrustFraction: round(clamp(base + pitchTerm + rollTerm), 3),
      temperatureC: round(28 + (base > 0 ? 16 : 0) + this.#random() * 4, 1),
    }))
  }

  /**
   * The nearest thing this Drone can see, or null when it can see nothing close.
   *
   * Returns `undefined` for an airframe with no rangefinder at all — the board draws
   * those two cases differently, and it can only do that if the difference survives
   * the whole way from here.
   */
  #proximity(drone: SimulatedDrone): ProximityReading | null | undefined {
    if (!drone.hasRangefinder) return undefined
    if (drone.altitudeM <= 0) return null

    const toWall = Math.min(
      drone.eastM - ROOM.westM,
      ROOM.eastM - drone.eastM,
      drone.northM - ROOM.southM,
      ROOM.northM - drone.northM,
    )

    let nearest = { metres: toWall, bearingDegrees: null as number | null }

    for (const other of this.#drones.values()) {
      if (other === drone || other.altitudeM <= 0) continue
      const east = other.eastM - drone.eastM
      const north = other.northM - drone.northM
      const metres = Math.hypot(east, north)
      if (metres >= nearest.metres) continue

      // Clockwise from the nose, so a Teacher reading it knows which way to look.
      const absolute = (Math.atan2(east, north) * 180) / Math.PI
      nearest = {
        metres,
        bearingDegrees: round(((absolute - drone.yawDegrees) % 360 + 360) % 360, 0),
      }
    }

    return { metres: round(nearest.metres, 2), bearingDegrees: nearest.bearingDegrees }
  }

  #autoLanding(drone: SimulatedDrone): AutoLandingState {
    if (!drone.canAutoLand) return 'unsupported'
    if (drone.autoLanding) return 'in-progress'
    return drone.altitudeM > 0 ? 'ready' : 'unavailable'
  }

  #emit(drone: SimulatedDrone): void {
    const telemetry: Telemetry = {
      batteryFraction: round(drone.batteryFraction),
      batteryIsEstimate: drone.batteryIsEstimate,
      airborne: drone.airborne,
      fault: drone.fault,

      altitudeM: drone.altitudeM,
      orientation: {
        pitchDegrees: drone.pitchDegrees,
        rollDegrees: drone.rollDegrees,
        yawDegrees: drone.yawDegrees,
      },
      motors: this.#motors(drone),
      emergencyStopTriggered: drone.emergencyStopTriggered,
      autoLanding: this.#autoLanding(drone),
      position: { eastM: drone.eastM, northM: drone.northM },
      linkGroupId: drone.linkGroupId,

      // Omitted entirely on an airframe without the sensor, rather than sent as a zero.
      ...(drone.hasCamera ? { camera: { streaming: drone.streaming } } : {}),
      ...(drone.hasRangefinder ? { proximity: this.#proximity(drone) ?? null } : {}),

      extra: {
        satellitesVisible: Math.round(6 + this.#random() * 6),
        firmware: '1.4.2',
      },
    }

    for (const listener of this.#listeners) listener({ droneId: drone.registration.id, telemetry })
  }
}

/**
 * The room the simulated Fleet flies in, in metres from where it was set up. Bounds are
 * what give the rangefinder something to find, so obstacle warnings on the board are
 * driven by a Drone genuinely approaching a wall rather than by a timer.
 */
const ROOM = { westM: -2, eastM: 8, southM: -3, northM: 3 } as const

const clampTo = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value))

export interface SimulatorOptions {
  readonly registrations: readonly DroneRegistration[]
  readonly clock: Clock
  readonly reportIntervalMs?: number
  /** Injected so a test can pin the Fleet's behaviour exactly. */
  readonly random?: () => number
  readonly idleDrainPerMinute?: number
  readonly flyingDrainPerMinute?: number
  /** How fast a Drone on charge climbs. Realistic by default, not demo-fast. */
  readonly chargePerMinute?: number
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
  charging: boolean

  /** What this airframe is fitted with. Fixed for the life of the Drone. */
  readonly hasRangefinder: boolean
  readonly hasCamera: boolean
  readonly canAutoLand: boolean

  readonly homeEastM: number
  readonly homeNorthM: number
  eastM: number
  northM: number
  altitudeM: number
  targetAltitudeM: number
  yawDegrees: number
  pitchDegrees: number
  rollDegrees: number
  emergencyStopTriggered: boolean
  autoLanding: boolean
  streaming: boolean
  linkGroupId: string | null
}

const DEFAULT_FAULT: FaultReport = {
  code: 'IMU_CALIBRATION',
  description: 'Motion sensor needs recalibrating',
}

/** Charging stops here rather than at 1, the way a real charger tapers off. */
const FULLY_CHARGED = 0.98

const clamp = (value: number) => Math.min(1, Math.max(0, value))
const round = (value: number, places = 3) => Number(value.toFixed(places))
