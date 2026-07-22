import type {
  BatterySample,
  DroneId,
  DroneState,
  EventSeverity,
  FleetEvent,
  FleetEventKind,
  FleetHistory,
  FleetState,
  Unsubscribe,
} from '@techtechflight/contract'

/**
 * What happened to the Fleet, derived from what it looked like a moment ago.
 *
 * Status is derived in `status.ts` and nowhere else; this is the same rule one level up.
 * A Telemetry Source reports observations, `deriveStatus` turns them into a Status, and
 * this turns a pair of Statuses into the sentence a Teacher would say. Nothing here
 * decides what a Drone *is* — only what changed about it.
 */

export interface HistoryOptions {
  /** How many events to retain. A school day of a small Fleet fits comfortably. */
  readonly maxEvents?: number
  /** How many battery readings to retain per Drone. */
  readonly maxSamplesPerDrone?: number
  /** How often to keep a reading when the charge is holding steady. */
  readonly minSampleIntervalMs?: number
  /** A jump this large is kept immediately, however recently the last one was. */
  readonly minSampleDelta?: number
}

export const DEFAULT_HISTORY: Required<HistoryOptions> = {
  maxEvents: 500,
  maxSamplesPerDrone: 240,
  minSampleIntervalMs: 15_000,
  minSampleDelta: 0.02,
}

/**
 * Exactly one event per transition, chosen by what a Teacher would want told.
 *
 * The order of these branches is the whole design. A Drone that lands with a fault has
 * faulted — that is the news, and "landed" is trivia beside it. A Drone that drops out
 * of contact has done one thing, not four, however many of its other properties changed
 * in the same tick. Emitting several events per transition would turn a timeline into
 * a log, which is the thing a Teacher already cannot read.
 */
function classify(from: DroneState, to: DroneState): { kind: FleetEventKind; detail: string | null } | null {
  if (from.status === to.status) return null

  if (to.status === 'Offline') return { kind: 'contact-lost', detail: null }
  if (from.status === 'Offline') {
    return { kind: 'contact-restored', detail: `Back in contact as ${to.status}` }
  }
  if (to.status === 'Fault') {
    return { kind: 'fault-raised', detail: to.telemetry?.fault?.description ?? null }
  }
  if (to.status === 'Flying') return { kind: 'took-off', detail: null }
  if (from.status === 'Fault') return { kind: 'fault-cleared', detail: `Now ${to.status}` }
  if (from.status === 'Flying') return { kind: 'landed', detail: `Now ${to.status}` }
  if (to.status === 'Not Ready') return { kind: 'charge-low', detail: null }
  return { kind: 'became-ready', detail: null }
}

/**
 * How loudly each kind reads.
 *
 * The board's two-tier split (ADR-0004), applied to time rather than to tiles: a Drone
 * needing a charge is amber, a Drone leaving the set is coral, and everything else is
 * the Fleet going about its day. Note that `contact-lost` is routine — the glossary is
 * explicit that Offline is the normal resting state and carries no implication that
 * anything is wrong, and a timeline that shouted every switch-off would train a Teacher
 * to skim past the two entries that matter.
 */
const SEVERITY: Readonly<Record<FleetEventKind, EventSeverity>> = {
  'first-contact': 'routine',
  'contact-lost': 'routine',
  'contact-restored': 'routine',
  'took-off': 'routine',
  landed: 'routine',
  'fault-raised': 'fault',
  'fault-cleared': 'routine',
  'charge-low': 'attention',
  'became-ready': 'routine',
}

/**
 * The events between two snapshots.
 *
 * Pure, so the whole of what a Teacher will read back at the end of a lesson can be
 * tested by handing it two Fleet States.
 */
export function deriveEvents(before: FleetState | null, after: FleetState): readonly FleetEvent[] {
  if (!before) return []

  const previous = new Map(before.drones.map((drone) => [drone.id, drone]))
  const events: FleetEvent[] = []

  for (const drone of after.drones) {
    const was = previous.get(drone.id)
    // A Drone that has only just been registered is seeded, not announced. The Fleet
    // gaining a tile is not something that happened to an aircraft.
    if (!was) continue

    /*
     * Being responded for the first time is its own news, and it is not a Status
     * change — a Drone the School has never responded is already Offline, so the
     * moment it finally speaks would otherwise be silent unless it also happened to
     * arrive charged.
     */
    if (was.lastContact === null && drone.lastContact !== null) {
      events.push(event(drone, 'first-contact', null, drone.lastContact, null))
      continue
    }

    const change = classify(was, drone)
    if (!change) continue

    events.push(
      event(drone, change.kind, was.status, drone.lastContact ?? after.generatedAt, change.detail),
    )
  }

  return events
}

function event(
  drone: DroneState,
  kind: FleetEventKind,
  from: DroneState['status'] | null,
  at: number,
  detail: string | null,
): FleetEvent {
  return {
    // Derived rather than random, so replaying the same two snapshots cannot produce
    // two different histories — and so a board can dedupe on it without trusting order.
    id: `${drone.id}@${at}#${kind}`,
    at,
    droneId: drone.id,
    droneName: drone.name,
    kind,
    from,
    to: drone.status,
    detail,
    severity: SEVERITY[kind],
  }
}

/**
 * Keeps a bounded record of the recent past.
 *
 * Bounded is the point. This process runs for the length of a school day on a Teacher's
 * laptop, and an unbounded log is a memory leak with a nice name. `since` reports how
 * far back the answer is actually trustworthy, so a board says "in the last two hours"
 * rather than implying it knows about last week.
 */
export class FleetHistoryRecorder {
  readonly #options: Required<HistoryOptions>
  readonly #batteries = new Map<DroneId, BatterySample[]>()
  readonly #listeners = new Set<(events: readonly FleetEvent[]) => void>()

  #events: FleetEvent[] = []
  #previous: FleetState | null = null
  #openedAt: number | null = null
  /** The moment retention has eaten up to. Everything before it is gone for good. */
  #trimmedBefore = 0

  constructor(options: HistoryOptions = {}) {
    this.#options = { ...DEFAULT_HISTORY, ...options }
  }

  /**
   * Take a Fleet State into the record, and return whatever it turned out to mean.
   *
   * The first call seeds rather than announces: a ground station starting up next to a
   * cupboard of switched-off Drones has not just watched six Drones go offline.
   */
  observe(state: FleetState): readonly FleetEvent[] {
    this.#openedAt ??= state.generatedAt

    const events = deriveEvents(this.#previous, state)
    this.#previous = state
    this.#sampleBatteries(state)

    if (events.length > 0) {
      this.#events.push(...events)
      this.#trimEvents()
      for (const listener of this.#listeners) listener(events)
    }

    return events
  }

  history(): FleetHistory {
    return {
      events: [...this.#events],
      batteries: [...this.#batteries].map(([droneId, samples]) => ({
        droneId,
        samples: [...samples],
      })),
      since: Math.max(this.#openedAt ?? 0, this.#trimmedBefore),
    }
  }

  onEvents(listener: (events: readonly FleetEvent[]) => void): Unsubscribe {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  /**
   * Readings are stamped with Last Contact rather than with the moment this ran, so a
   * chart plots when a Drone was actually responded. Without that, a Drone that fell
   * silent would draw a flat line at its last value instead of simply stopping — which
   * is the same lie the board spends its whole design avoiding.
   */
  #sampleBatteries(state: FleetState): void {
    const { minSampleIntervalMs, minSampleDelta, maxSamplesPerDrone } = this.#options

    for (const drone of state.drones) {
      if (!drone.telemetry || drone.lastContact === null) continue

      const samples = this.#batteries.get(drone.id) ?? []
      const last = samples.at(-1)

      if (last) {
        // Nothing new has responded, so there is nothing new to plot.
        if (drone.lastContact <= last.at) continue
        const moved = Math.abs(drone.telemetry.batteryFraction - last.fraction)
        if (drone.lastContact - last.at < minSampleIntervalMs && moved < minSampleDelta) continue
      }

      samples.push({ at: drone.lastContact, fraction: drone.telemetry.batteryFraction })
      while (samples.length > maxSamplesPerDrone) {
        const dropped = samples.shift()
        if (dropped) this.#trimmedBefore = Math.max(this.#trimmedBefore, dropped.at)
      }
      this.#batteries.set(drone.id, samples)
    }
  }

  #trimEvents(): void {
    while (this.#events.length > this.#options.maxEvents) {
      const dropped = this.#events.shift()
      if (dropped) this.#trimmedBefore = Math.max(this.#trimmedBefore, dropped.at)
    }
  }
}
