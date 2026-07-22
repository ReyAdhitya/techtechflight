import type { DroneId } from '@techtechflight/contract'
import { alertKey, type AlertSeverity, type DroneVitals, type VitalsAlert } from './vitals'

/**
 * Which Alerts the Teacher has taken.
 *
 * The difference between a status board and a controller's position. A board reports; a
 * controller works a queue down, and an item they have dealt with stops asking. Without
 * this the same three things ask for attention for the whole lesson and the Teacher learns
 * to stop reading the top of the screen — which is the one place everything else assumes
 * they are looking.
 *
 * Acknowledging changes what the Teacher sees and nothing else. It never touches a Drone,
 * never reaches the Fleet, and never suppresses the condition anywhere but the queue: the
 * Drone's own strip still carries it, quietly, because a Teacher who has seen a problem
 * has not thereby fixed it.
 */

const SEVERITY_ORDER: Readonly<Record<AlertSeverity, number>> = {
  critical: 0,
  warning: 1,
  info: 2,
}

interface Taken {
  readonly at: number
  /** What it was when it was taken, so a condition that gets worse asks again. */
  readonly severity: AlertSeverity
}

export class AcknowledgementTracker {
  readonly #taken = new Map<string, Taken>()

  acknowledge(droneId: DroneId, alert: VitalsAlert, at: number): void {
    this.#taken.set(alertKey(droneId, alert.kind), { at, severity: alert.severity })
  }

  /**
   * True when the Teacher has already dealt with this and it has not got worse.
   *
   * Severity is compared rather than only presence: a separation warning taken at arm's
   * length and a separation that has since become critical are not the same news, and the
   * second has to be allowed to interrupt.
   */
  isTaken(droneId: DroneId, alert: VitalsAlert): boolean {
    const taken = this.#taken.get(alertKey(droneId, alert.kind))
    if (taken === undefined) return false
    return SEVERITY_ORDER[alert.severity] >= SEVERITY_ORDER[taken.severity]
  }

  /** When it was taken, for saying so quietly on the Drone's own strip. */
  takenAt(droneId: DroneId, alert: VitalsAlert): number | null {
    return this.#taken.get(alertKey(droneId, alert.kind))?.at ?? null
  }

  /**
   * Forget anything that is no longer happening.
   *
   * A condition that clears and comes back an hour later is new news, not something the
   * Teacher dealt with before lunch. Same rule the Alert start times follow, for the same
   * reason — and without it a Drone that faults, is fixed, and faults again would never
   * ask for attention a second time.
   */
  observe(vitals: readonly DroneVitals[]): void {
    const live = new Set<string>()
    for (const entry of vitals) {
      for (const alert of entry.alerts) live.add(alertKey(entry.droneId, alert.kind))
    }
    for (const key of [...this.#taken.keys()]) {
      if (!live.has(key)) this.#taken.delete(key)
    }
  }

  get size(): number {
    return this.#taken.size
  }

  reset(): void {
    this.#taken.clear()
  }
}
