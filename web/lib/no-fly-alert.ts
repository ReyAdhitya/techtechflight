import type { DroneId } from '@techtechflight/contract'
import { breachesAt, type AirspaceBreach, type Zone } from './airspace.ts'
import {
  BreachTracker,
  type BreachEvent,
  type FleetBreachInput,
} from './airspace-breach.ts'
import { playbookFor } from './incident-playbook.ts'
import type { DroneVitals, VitalsAlert } from './vitals.ts'

/**
 * The no-fly Alert — raised once when a Drone enters a No-fly Zone.
 *
 * `breachesAt` keeps saying the same thing while a craft hovers inside the netting;
 * `BreachTracker` turns that into a rising edge. This layer turns each new
 * `entered-no-fly` edge into a `critical` Alert whose words come from the incident
 * playbook — what to do, not where the Drone is.
 *
 * Pure state, no React. The Integrator feeds airspace breaches here and merges the
 * returned alerts into each Drone's vitals.
 */

/** Teacher-facing words for a No-fly breach — action from the playbook, not the geometry. */
export function noFlyAlertText(): string {
  const recommended = playbookFor('no-fly')?.responses[0]
  if (!recommended) return 'Turn back out of the No-fly Zone.'
  return `${recommended.label}. ${recommended.detail}`
}

/** One rising-edge breach becomes an Alert, or null when it is not a No-fly entry. */
export function noFlyAlertFromBreach(event: BreachEvent): VitalsAlert | null {
  if (event.kind !== 'entered-no-fly') return null
  return {
    kind: 'no-fly',
    severity: 'critical',
    text: noFlyAlertText(),
    since: event.at,
  }
}

/**
 * Tracks No-fly entries per Drone and returns Alerts only on first crossing.
 *
 * `left-mission-zone` breaches are ignored here — different words, same Integrator
 * hook, and a ticket of their own if the Mission boundary needs its own Alert.
 */
export class NoFlyAlertTracker {
  readonly #tracker = new BreachTracker()

  observe(
    droneId: DroneId,
    breaches: readonly AirspaceBreach[],
    at: number,
  ): readonly VitalsAlert[] {
    return this.#tracker
      .observe(droneId, breaches, at)
      .map((event) => noFlyAlertFromBreach(event))
      .filter((alert): alert is VitalsAlert => alert !== null)
  }

  observeFleet(
    craft: readonly FleetBreachInput[],
    at: number,
  ): readonly (VitalsAlert & { readonly droneId: DroneId })[] {
    const alerts: (VitalsAlert & { readonly droneId: DroneId })[] = []
    for (const entry of craft) {
      for (const alert of this.observe(entry.droneId, entry.breaches, at)) {
        alerts.push({ ...alert, droneId: entry.droneId })
      }
    }
    return alerts
  }

  reset(): void {
    this.#tracker.reset()
  }
}

/**
 * The board's Alerts with a No-fly Alert added to every Drone that is inside a zone.
 *
 * **A level, not an edge.** `NoFlyAlertTracker` above turns a hover inside the netting into a
 * single rising edge, which is the right shape for a log and the wrong shape for a screen:
 * every other Alert on this board is recomputed from the current reading, so one that
 * appeared for a tick and vanished would leave a Drone sitting in a No-fly Zone with a clean
 * strip. `AlertTracker` in `FleetProvider` already stamps when each condition was first seen,
 * so a level does not re-announce itself.
 *
 * Zones are not Telemetry and never will be (ADR-0019 says why), so this cannot live in
 * `fleetVitals`: it is the one derivation that needs something the Teacher drew.
 *
 * Before this, nothing called any of it. A Drone crossing into a zone drew a hatched polygon
 * under itself on the Scope and raised nothing on the strip, on the console, or in Attention,
 * while ADR-0019 recorded that breaches raise an Alert. They did not.
 */
export function withNoFlyAlerts(
  vitals: readonly DroneVitals[],
  zones: readonly Zone[],
  now: number,
): readonly DroneVitals[] {
  if (zones.length === 0) return vitals

  let changed = false
  const next = vitals.map((entry) => {
    if (entry.position === null || entry.position === undefined) return entry
    if (!entry.airborne) return entry
    if (breachesAt(zones, entry.position).length === 0) return entry
    // Already carrying one, from a previous pass through here.
    if (entry.alerts.some((alert) => alert.kind === 'no-fly')) return entry
    changed = true
    return {
      ...entry,
      alerts: [
        { kind: 'no-fly' as const, severity: 'critical' as const, text: noFlyAlertText(), since: now },
        ...entry.alerts,
      ],
    }
  })

  return changed ? next : vitals
}
