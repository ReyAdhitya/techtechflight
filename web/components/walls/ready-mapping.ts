import type { AlertKind } from '@/lib/vitals'
import type { DroneVitals } from '@/lib/vitals'
import type { StatusPresentation } from '@/lib/status-presentation'

/** Pre-flight board vocabulary — four labels, not the full Status enum. */
export type ReadyBoardLabel = 'Ready' | 'Not ready' | 'Offline' | 'Fault'

const FAULT_ALERT_KINDS: ReadonlySet<AlertKind> = new Set(['fault', 'emergency-stop'])

export interface ReadyBoardPresentation {
  readonly label: ReadyBoardLabel
  readonly shape: StatusPresentation['shape']
  readonly className: string
}

export const READY_BOARD_PRESENTATION: Readonly<Record<ReadyBoardLabel, ReadyBoardPresentation>> =
  {
    Ready: { label: 'Ready', shape: 'filled', className: 'text-status-ready' },
    'Not ready': { label: 'Not ready', shape: 'half', className: 'text-status-not-ready' },
    Offline: { label: 'Offline', shape: 'hollow', className: 'text-status-offline' },
    Fault: { label: 'Fault', shape: 'square', className: 'text-status-fault' },
  }

/**
 * Pre-flight readiness for one Drone, from vitals and Status only.
 *
 * Offline and stale silence outrank everything — a board that says Ready on a Drone that
 * has gone quiet is worse than one that says Offline. Fault and emergency outrank charge
 * and phase. Ready requires grounded and serviceable (Status Ready).
 */
export function readyBoardLabel(vitals: DroneVitals): ReadyBoardLabel {
  if (vitals.status === 'Offline' || vitals.phase === 'no-contact') {
    return 'Offline'
  }

  if (vitals.alerts.some((alert) => alert.kind === 'no-response')) {
    return 'Offline'
  }

  if (
    vitals.status === 'Fault' ||
    vitals.phase === 'emergency' ||
    vitals.alerts.some((alert) => FAULT_ALERT_KINDS.has(alert.kind))
  ) {
    return 'Fault'
  }

  if (vitals.status === 'Ready' && !vitals.airborne) {
    return 'Ready'
  }

  return 'Not ready'
}

/** Counts for the calm summary line. Offline, Fault, and Not ready share the second bucket. */
export function readyBoardSummary(labels: readonly ReadyBoardLabel[]): {
  readonly ready: number
  readonly notReady: number
} {
  let ready = 0
  let notReady = 0
  for (const label of labels) {
    if (label === 'Ready') ready += 1
    else notReady += 1
  }
  return { ready, notReady }
}
