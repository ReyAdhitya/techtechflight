import type { DroneId, DroneState } from '@techtechflight/contract'
import { SEPARATION_WARNING_M, type DroneVitals } from '@/lib/vitals'

export interface ProximityPair {
  readonly key: string
  readonly droneIdA: DroneId
  readonly droneIdB: DroneId
  readonly callsignA: string
  readonly callsignB: string
  readonly separationM: number
}

/**
 * Every pair closer than the warning distance, each pair once.
 *
 * Vitals record the conflict from both ends — A is near B and B is near A — so the pair
 * is keyed on the two ids sorted, and the second sighting is dropped rather than drawn
 * twice on the wall.
 */
export function proximityPairs(
  vitals: readonly DroneVitals[],
  drones: readonly DroneState[],
): readonly ProximityPair[] {
  const byCallsign = new Map(drones.map((drone) => [drone.name, drone]))
  const byId = new Map(drones.map((drone) => [drone.id, drone]))
  const seen = new Set<string>()
  const pairs: ProximityPair[] = []

  for (const entry of vitals) {
    if (entry.separationM === null || entry.separationM >= SEPARATION_WARNING_M) continue
    if (entry.conflictWith === null) continue
    const other = byCallsign.get(entry.conflictWith)
    const mine = byId.get(entry.droneId)
    if (!other || !mine) continue
    if (!mine.telemetry?.position || !other.telemetry?.position) continue

    const key = [mine.id, other.id].sort().join('~')
    if (seen.has(key)) continue
    seen.add(key)

    const sorted = [mine.id, other.id].sort() as [DroneId, DroneId]
    const [idA, idB] = sorted
    pairs.push({
      key,
      droneIdA: idA,
      droneIdB: idB,
      callsignA: byId.get(idA)!.name,
      callsignB: byId.get(idB)!.name,
      separationM: entry.separationM,
    })
  }

  return pairs.sort((a, b) => a.separationM - b.separationM)
}

export function proximityWallSummary(pairs: readonly ProximityPair[]): number {
  return pairs.length
}

/** Stable link target for a pair tile — first id in sorted order. */
export function pairLinkDroneId(pair: ProximityPair): DroneId {
  return pair.droneIdA
}

export function formatPairLabel(callsignA: string, callsignB: string): string {
  return `${callsignA} and ${callsignB}`
}

/** One decimal and a fixed suffix so every tile scans in a column. */
export function formatSeparationReadout(separationM: number): string {
  return `${separationM.toFixed(1)} m apart`
}
