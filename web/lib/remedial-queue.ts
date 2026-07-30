import type { DroneId } from '@techtechflight/contract'
import type { LessonRecord, Logbook } from './logbook'
import { studentOf } from './logbook'

/** One Student or Drone flagged for follow-up after a lesson. */
export interface RemedialEntry {
  readonly droneId: DroneId
  readonly droneName: string
  readonly studentName?: string
  readonly reason: string
  readonly addedAt: number
  readonly lessonId?: string
}

export function remedialQueueOf(book: Logbook): readonly RemedialEntry[] {
  return book.remedialQueue ?? []
}

/** Drones with fault-severity incidents in a closed lesson — one row each, first reason kept. */
export function remedialCandidatesFromLesson(
  lesson: LessonRecord,
  book: Logbook,
): readonly RemedialEntry[] {
  const seen = new Set<DroneId>()
  const entries: RemedialEntry[] = []
  for (const incident of lesson.incidents) {
    if (incident.severity !== 'fault' || incident.droneId === undefined) continue
    if (seen.has(incident.droneId)) continue
    seen.add(incident.droneId)
    const studentName = studentOf(book, incident.droneId) ?? undefined
    entries.push({
      droneId: incident.droneId,
      droneName: incident.droneName ?? incident.droneId,
      studentName,
      reason: incident.text,
      addedAt: lesson.endedAt ?? incident.at,
      lessonId: lesson.id,
    })
  }
  return entries
}

export function mergeRemedialQueue(
  current: readonly RemedialEntry[],
  incoming: readonly RemedialEntry[],
): readonly RemedialEntry[] {
  const byDrone = new Map(current.map((entry) => [entry.droneId, entry]))
  for (const entry of incoming) {
    if (!byDrone.has(entry.droneId)) byDrone.set(entry.droneId, entry)
  }
  return [...byDrone.values()].sort((a, b) => b.addedAt - a.addedAt)
}
