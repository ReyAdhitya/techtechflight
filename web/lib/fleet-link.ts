import type { FleetHistory, FleetState, Unsubscribe } from '@techtechflight/contract'

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

export interface FleetLink {
  readonly snapshot: FleetSnapshot
  subscribe(listener: (snapshot: FleetSnapshot) => void): Unsubscribe
  start(): void
  stop(): void
}
