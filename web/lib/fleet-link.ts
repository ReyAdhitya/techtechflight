import type {
  CommandOutcomeMessage,
  DroneCommand,
  FleetHistory,
  FleetState,
  Unsubscribe,
} from '@techtechflight/contract'

/**
 * Where the board reads its Fleet from.
 *
 * There are two of these and there will not be a third: one that reads across a socket
 * from a ground station on a laptop, and one that runs the Fleet core in this browser
 * with no server behind it at all (ADR-0013).
 *
 * No screen may know which it has. A Fleet State is a Fleet State, and the moment a
 * component branches on where one came from, the demonstration and the product have
 * started to drift apart — which is the thing this seam exists to prevent.
 *
 * This is the upper of the two seams. The lower one is the Telemetry Source (ADR-0001),
 * which decides whether Telemetry comes from a simulation or an aircraft. They are
 * orthogonal: swapping simulation for hardware changes nothing here.
 */

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

/**
 * Making the world misbehave, for a demonstration.
 *
 * Named here rather than imported from the simulator, so a screen offering these never has
 * to reach past the seam for a type. That matters more than it looks: it keeps the rule
 * that no screen imports the simulator enforceable by a check rather than by agreement.
 *
 * These are emphatically **not** Commands (requirement C9). Asking a Drone to land is a
 * request to an aircraft and can one day be real; inventing a fault is the world
 * pretending, and never can be. They must never share a surface, or a Teacher would learn
 * an interaction that cannot exist on hardware.
 */
export interface ScenarioControls {
  injectFault(droneId: string): void
  clearFault(droneId: string): void
  loseLink(droneId: string): void
  restoreLink(droneId: string): void
  takeOff(droneId: string): void
  /**
   * The simulated aircraft plays the child's part: take off, fly these points, hold station.
   *
   * In a room there is a ten year old with a controller. In a demo there is nobody, so a
   * Drone that rose on a grant and hovered over the bench would make the Teacher's board
   * look like it had done nothing. Called when the Teacher grants that Drone's takeoff, and
   * never at any other moment: nothing leaves the ground that a Teacher did not clear.
   *
   * The world behaving, rather than the world misbehaving, but the same kind of thing and so
   * the same door. It is not a Command and must never be offered as one.
   */
  flyRoute(
    droneId: string,
    waypoints: readonly { readonly eastM: number; readonly northM: number }[],
  ): void
  /**
   * The simulated child flies home and lands, because the Teacher approved the task.
   *
   * The same flight as Recall and a different act. Recall is a Command sent when something is
   * wrong; this is how a normal flight ends, and a Teacher who ended one with Recall would be
   * ending a lesson with the fire alarm.
   */
  flyHome(droneId: string): void
  setBattery(droneId: string, fraction: number): void
  plugIn(droneId: string): void
  placeNear(droneId: string, nearDroneId: string, separationM: number): void
  setPosition(droneId: string, eastM: number, northM: number): void
  setAltitude(droneId: string, altitudeM: number): void
  triggerEmergencyStop(droneId: string): void
  /**
   * Clear a latched emergency stop. Counterpart to the Stop command on a simulated Fleet —
   * not inventing a fault (C9), so Control may offer **Release stop** when the latch is set.
   * Absent on a hardware Fleet (`scenarios` is null there).
   */
  resetEmergencyStop(droneId: string): void
  /**
   * Toggle the simulated camera stream. Not a Command (C9) — Telemetry only carries
   * `camera.streaming`, never a URL. Hardware Fleets leave `scenarios` null, so the
   * Drone screen must not invent a Start that claims a real airframe.
   */
  startCamera(droneId: string): void
  stopCamera(droneId: string): void
  link(droneIds: readonly string[], groupId?: string): void
  unlink(droneId: string): void
  /** Park the whole classroom set — clears training scenarios. */
  resetClassroom(): void
}

export interface FleetLink {
  readonly snapshot: FleetSnapshot
  subscribe(listener: (snapshot: FleetSnapshot) => void): Unsubscribe
  start(): void
  stop(): void
  /**
   * Ask a Drone to do something.
   *
   * Sending is not doing. What comes back on `onCommandOutcome` says only whether the
   * Fleet took the request; what the aircraft actually did is known from the Telemetry
   * that follows and from nothing else.
   */
  send(command: DroneCommand): void
  onCommandOutcome(listener: (outcome: CommandOutcomeMessage) => void): Unsubscribe
  /** Present only on a simulated Fleet. Null is the honest answer for a real one. */
  readonly scenarios: ScenarioControls | null
}
