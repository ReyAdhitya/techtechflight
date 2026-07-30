import type { AlertKind } from '@/lib/vitals'
import type { DroneVitals } from '@/lib/vitals'

const FAULT_ALERT_KINDS: ReadonlySet<AlertKind> = new Set(['fault', 'emergency-stop'])

export interface FaultMosaicEntry {
  readonly vitals: DroneVitals
  readonly stale: boolean
  /** Board order index — stable tie-break within priority groups. */
  readonly boardIndex: number
}

/**
 * Whether a tile belongs in the front of the fault mosaic.
 *
 * Fault, latched emergency, and stale silence are the conditions a Teacher scans for on
 * this wall. Unlike Control strips, this wall may reorder — that is the point of a mosaic.
 */
export function isFaultMosaicPriority(vitals: DroneVitals, stale: boolean): boolean {
  if (stale) return true
  if (vitals.status === 'Fault') return true
  if (vitals.phase === 'emergency') return true
  if (vitals.alerts.some((alert) => FAULT_ALERT_KINDS.has(alert.kind))) return true
  return false
}

/** Priority tiles first; within each group, preserve board order. */
export function sortFaultMosaicEntries(
  entries: readonly FaultMosaicEntry[],
): readonly FaultMosaicEntry[] {
  return [...entries].sort((a, b) => {
    const aPriority = isFaultMosaicPriority(a.vitals, a.stale)
    const bPriority = isFaultMosaicPriority(b.vitals, b.stale)
    if (aPriority !== bPriority) return aPriority ? -1 : 1
    return a.boardIndex - b.boardIndex
  })
}

export function faultMosaicSummary(entries: readonly FaultMosaicEntry[]): number {
  return entries.filter((entry) => isFaultMosaicPriority(entry.vitals, entry.stale)).length
}
