import type { DroneId } from '@techtechflight/contract'

/** One craft on the pack-down list — identity plus the name a Teacher says out loud. */
export interface PackdownCraft {
  readonly droneId: DroneId
  readonly droneName: string
}

/**
 * Which crafts the Teacher has ticked as packed down for this lesson.
 *
 * Lives outside the Logbook on purpose: pack-down is a closing ritual for the room,
 * not a permanent Student record. Scoped to `lessonId` so a new lesson starts clean —
 * yesterday's ticks must not survive into the next period.
 */
export interface PackdownChecklistState {
  readonly lessonId: string
  /** Drone IDs ticked as packed. Display order always follows the craft list, never this. */
  readonly ticked: readonly DroneId[]
}

export function emptyPackdownChecklist(lessonId: string): PackdownChecklistState {
  return { lessonId, ticked: [] }
}

/**
 * Drop every tick when the lesson changes.
 *
 * Acceptance: reset each lesson. A Teacher who packed down Period 3 must not see those
 * ticks still checked when Period 4 closes.
 */
export function ensurePackdownLesson(
  state: PackdownChecklistState,
  lessonId: string,
): PackdownChecklistState {
  if (state.lessonId === lessonId) return state
  return emptyPackdownChecklist(lessonId)
}

export function isPackdownTicked(
  state: PackdownChecklistState,
  droneId: DroneId,
): boolean {
  return state.ticked.includes(droneId)
}

export function togglePackdownTick(
  state: PackdownChecklistState,
  droneId: DroneId,
): PackdownChecklistState {
  if (state.ticked.includes(droneId)) {
    return { ...state, ticked: state.ticked.filter((id) => id !== droneId) }
  }
  return { ...state, ticked: [...state.ticked, droneId] }
}

export function setPackdownTick(
  state: PackdownChecklistState,
  droneId: DroneId,
  ticked: boolean,
): PackdownChecklistState {
  const already = state.ticked.includes(droneId)
  if (ticked === already) return state
  return togglePackdownTick(state, droneId)
}

/** Progress counts — zero is shown, not hidden (DELIBERATE-POSITIONS 3). */
export function packdownCounts(
  state: PackdownChecklistState,
  crafts: readonly PackdownCraft[],
): { readonly ticked: number; readonly total: number } {
  const known = new Set(crafts.map((craft) => craft.droneId))
  const ticked = state.ticked.filter((id) => known.has(id)).length
  return { ticked, total: crafts.length }
}
