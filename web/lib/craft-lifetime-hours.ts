import type { LessonRecord } from '@/lib/logbook'

/**
 * Accumulated airborne hours per craft across every closed Lesson (#310 / F191).
 *
 * The Logbook does not store airborne duration per flight. A craft that took off during
 * a closed Lesson (`tally.flights > 0`) is charged the Lesson wall-clock — the stretch
 * the Teacher already closed — rather than inventing a shorter airborne interval. Open
 * Lessons do not count: the tally is written as they end.
 */

const MS_PER_HOUR = 3_600_000

export type CraftLifetimeHours = {
  readonly droneId: string
  readonly droneName: string
  readonly hours: number
}

function droneName(lesson: LessonRecord, droneId: string): string {
  return (
    lesson.incidents.find((incident) => incident.droneId === droneId)?.droneName ??
    lesson.commands?.find((command) => command.droneId === droneId)?.droneName ??
    droneId
  )
}

/**
 * Sum Lesson durations per craft that flew, then sort by board-stable id.
 *
 * Order is by `droneId`, never by hours — the same muscle-memory rule as tiles
 * (DELIBERATE-POSITIONS 1). Hours of zero still appear once a craft has ever flown.
 */
export function craftLifetimeHours(
  lessons: readonly LessonRecord[],
): readonly CraftLifetimeHours[] {
  const msById = new Map<string, { name: string; ms: number }>()

  for (const lesson of lessons) {
    if (lesson.endedAt === null || lesson.tally === undefined) continue
    const durationMs = Math.max(0, lesson.endedAt - lesson.startedAt)
    for (const [droneId, tally] of Object.entries(lesson.tally)) {
      if (tally.flights <= 0) continue
      const running = msById.get(droneId)
      const name = droneName(lesson, droneId)
      if (running) {
        msById.set(droneId, {
          name: running.name === droneId && name !== droneId ? name : running.name,
          ms: running.ms + durationMs,
        })
      } else {
        msById.set(droneId, { name, ms: durationMs })
      }
    }
  }

  return [...msById.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([droneId, entry]) => ({
      droneId,
      droneName: entry.name,
      hours: entry.ms / MS_PER_HOUR,
    }))
}

/** Hours for a Teacher — one decimal is enough at classroom scale; zero stays visible. */
export function formatLifetimeHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10
  return `${rounded.toFixed(1)} h`
}
