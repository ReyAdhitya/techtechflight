import type { DroneId, DroneState, Status } from '@techtechflight/contract'

/**
 * Craft that flew the last closed Lesson and have not come back.
 *
 * "Absent" here means Offline or gone from the Fleet — not the Teacher's headcount tick
 * (#128). A closed Lesson without a tally or assignments leaves nothing to compare, so
 * the notice stays quiet rather than guessing.
 */

export interface MissingCraft {
  readonly id: DroneId
  readonly name: string
}

/** Minimal closed-Lesson shape — tally / assignments / commands name who was out. */
export interface ClosedLessonCraftSource {
  readonly endedAt: number | null
  readonly tally?: Readonly<Record<string, unknown>>
  readonly assignments?: Readonly<Record<string, string>>
  readonly commands?: readonly { readonly droneId: string; readonly droneName: string }[]
}

/**
 * The most recently closed Lesson, or null when none have ended yet.
 */
export function lastClosedLesson<T extends { readonly endedAt: number | null }>(
  lessons: readonly T[],
): T | null {
  let latest: T | null = null
  for (const lesson of lessons) {
    if (lesson.endedAt === null) continue
    if (latest === null || (latest.endedAt !== null && lesson.endedAt > latest.endedAt)) {
      latest = lesson
    }
  }
  return latest
}

/** Drone IDs recorded on a closed Lesson, with the best name the record still has. */
export function craftFromClosedLesson(
  lesson: ClosedLessonCraftSource | null,
): readonly MissingCraft[] {
  if (lesson === null || lesson.endedAt === null) return []

  const names = new Map<string, string>()

  if (lesson.tally !== undefined) {
    for (const id of Object.keys(lesson.tally)) {
      if (!names.has(id)) names.set(id, id)
    }
  }
  if (lesson.assignments !== undefined) {
    for (const id of Object.keys(lesson.assignments)) {
      if (!names.has(id)) names.set(id, id)
    }
  }
  if (lesson.commands !== undefined) {
    for (const command of lesson.commands) {
      names.set(command.droneId, command.droneName)
    }
  }

  return [...names.entries()].map(([id, name]) => ({ id, name }))
}

function isInContact(status: Status): boolean {
  return status !== 'Offline'
}

/**
 * Names every craft from the last closed Lesson that is Offline or missing from the Fleet.
 * Board order of the prior set is preserved (DELIBERATE-POSITIONS 1).
 */
export function missingCraftSinceLastLesson(
  lesson: ClosedLessonCraftSource | null,
  drones: readonly Pick<DroneState, 'id' | 'name' | 'status'>[],
): readonly MissingCraft[] {
  const prior = craftFromClosedLesson(lesson)
  if (prior.length === 0) return []

  const byId = new Map(drones.map((drone) => [drone.id, drone]))
  const missing: MissingCraft[] = []

  for (const craft of prior) {
    const current = byId.get(craft.id)
    if (current === undefined) {
      missing.push(craft)
      continue
    }
    if (!isInContact(current.status)) {
      missing.push({ id: current.id, name: current.name })
    }
  }

  return missing
}
