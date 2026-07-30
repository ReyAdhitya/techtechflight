import type { DroneId } from '@techtechflight/contract'
import type { AlertSeverity, DroneVitals, VitalsAlert } from '@/lib/vitals'

const SEVERITY_ORDER: Readonly<Record<AlertSeverity, number>> = {
  critical: 0,
  warning: 1,
  info: 2,
}

/**
 * Whether this Drone belongs on the loud side of the attention wall.
 *
 * Fault, emergency, and stale stay loud even when the Teacher has acknowledged an alert —
 * the condition persists. Other alerts only count while they are still on the queue.
 */
export function isAttentionWallTroubled(
  vitals: DroneVitals,
  stale: boolean,
  isAcknowledged: (droneId: DroneId, alert: VitalsAlert) => boolean,
): boolean {
  if (vitals.status === 'Fault' || vitals.phase === 'emergency' || stale) {
    return true
  }
  return vitals.alerts.some((alert) => !isAcknowledged(vitals.droneId, alert))
}

export function attentionWallSummary(
  vitals: readonly DroneVitals[],
  staleFor: (droneId: DroneId) => boolean,
  isAcknowledged: (droneId: DroneId, alert: VitalsAlert) => boolean,
): number {
  return vitals.filter((entry) =>
    isAttentionWallTroubled(entry, staleFor(entry.droneId), isAcknowledged),
  ).length
}

/** Worst alert still asking for the Teacher on this Drone. */
export function worstUnacknowledgedAlert(
  vitals: DroneVitals,
  isAcknowledged: (droneId: DroneId, alert: VitalsAlert) => boolean,
): VitalsAlert | null {
  const pending = vitals.alerts.filter((alert) => !isAcknowledged(vitals.droneId, alert))
  if (pending.length === 0) return null
  return [...pending].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])[0]!
}

/** What the tile says beneath the callsign when a Drone is troubled. */
export function attentionWallHeadline(
  vitals: DroneVitals,
  stale: boolean,
  isAcknowledged: (droneId: DroneId, alert: VitalsAlert) => boolean,
): string {
  const alert = worstUnacknowledgedAlert(vitals, isAcknowledged)
  if (alert) return alert.text
  if (vitals.phase === 'emergency') return 'Emergency stop latched'
  if (vitals.status === 'Fault') return 'Fault'
  if (stale) return 'Last response is stale'
  return vitals.callsign
}

/** Border and tone for a troubled tile — same vocabulary as Status wall. */
export function attentionWallTileAccent(
  vitals: DroneVitals,
  stale: boolean,
  troubled: boolean,
  isAcknowledged: (droneId: DroneId, alert: VitalsAlert) => boolean,
): string {
  if (!troubled) return 'border-hairline text-ink-muted'

  if (vitals.phase === 'emergency') return 'border-2 border-status-fault bg-surface-1'

  if (vitals.status === 'Fault') return 'border-status-fault'

  const alert = worstUnacknowledgedAlert(vitals, isAcknowledged)
  if (alert?.severity === 'critical') return 'border-status-fault'
  if (alert?.severity === 'warning') return 'border-status-not-ready'
  if (stale) return 'border-hairline text-stale italic'

  return 'border-hairline'
}
