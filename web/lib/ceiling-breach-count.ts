import type { DroneId } from '@techtechflight/contract'

/**
 * Same number as `CLASSROOM_CEILING_M` on the height wall — duplicated here so lib never
 * imports components (import-boundaries). Keep both in step when the classroom height changes.
 */
export const DEFAULT_CLASSROOM_CEILING_M = 3

/**
 * Per-lesson ceiling breach counts for the report afterwards.
 *
 * A breach is a rising edge — a Drone that was at or below the classroom ceiling and is
 * now above it. Sitting above the line for a whole minute is still one breach; bobbing
 * back under and over again is another. Counts live in this browser (localStorage), not
 * in Telemetry, so Reports can read them after the lesson closes without inventing a
 * school database.
 */

export const CEILING_BREACH_COUNTS_KEY = 'techtechflight:ceiling-breach-counts'

export type CeilingSample = {
  readonly droneId: DroneId
  readonly altitudeM: number | null
}

export type CeilingBreachState = {
  readonly count: number
  /** Drone ids currently over the ceiling — used to detect the next rising edge. */
  readonly over: ReadonlySet<DroneId>
}

export function emptyCeilingBreachState(): CeilingBreachState {
  return { count: 0, over: new Set() }
}

export function isOverClassroomCeiling(
  altitudeM: number | null,
  ceilingM: number = DEFAULT_CLASSROOM_CEILING_M,
): boolean {
  if (altitudeM === null) return false
  return altitudeM > ceilingM
}

/**
 * Apply one vitals snapshot. Returns the next accumulator; never mutates the previous.
 */
export function observeCeilingBreaches(
  previous: CeilingBreachState,
  samples: readonly CeilingSample[],
  ceilingM: number = DEFAULT_CLASSROOM_CEILING_M,
): CeilingBreachState {
  const nextOver = new Set<DroneId>()
  let count = previous.count

  for (const sample of samples) {
    if (!isOverClassroomCeiling(sample.altitudeM, ceilingM)) continue
    nextOver.add(sample.droneId)
    if (!previous.over.has(sample.droneId)) count += 1
  }

  return { count, over: nextOver }
}

/** Rising edges in an ordered altitude series for one craft — useful in unit tests. */
export function countBreachesInSeries(
  altitudes: readonly (number | null)[],
  ceilingM: number = DEFAULT_CLASSROOM_CEILING_M,
): number {
  let count = 0
  let wasOver = false
  for (const altitudeM of altitudes) {
    const over = isOverClassroomCeiling(altitudeM, ceilingM)
    if (over && !wasOver) count += 1
    wasOver = over
  }
  return count
}

export function readLessonCeilingBreachCount(lessonId: string): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = window.localStorage.getItem(CEILING_BREACH_COUNTS_KEY)
    if (raw === null) return 0
    const parsed = JSON.parse(raw) as unknown
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return 0
    const value = (parsed as Record<string, unknown>)[lessonId]
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0
  } catch {
    return 0
  }
}

export function writeLessonCeilingBreachCount(lessonId: string, count: number): void {
  if (typeof window === 'undefined') return
  if (!Number.isFinite(count) || count < 0) return
  try {
    const raw = window.localStorage.getItem(CEILING_BREACH_COUNTS_KEY)
    let map: Record<string, number> = {}
    if (raw !== null) {
      const parsed = JSON.parse(raw) as unknown
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        map = { ...(parsed as Record<string, number>) }
      }
    }
    map[lessonId] = count
    window.localStorage.setItem(CEILING_BREACH_COUNTS_KEY, JSON.stringify(map))
  } catch {
    // School browsers can refuse storage; the Integrator still has the in-memory count.
  }
}

/** Words a Teacher can read on Reports — zero still prints (DELIBERATE-POSITIONS 3). */
export function formatCeilingBreachCount(count: number): string {
  if (count === 1) return '1 ceiling breach'
  return `${count} ceiling breaches`
}
