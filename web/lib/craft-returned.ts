import type { DroneId } from '@techtechflight/contract'

/** One craft in the return headcount — identity plus the name a Teacher calls across the room. */
export interface CraftRef {
  readonly droneId: DroneId
  readonly droneName: string
}

/**
 * Which crafts the Teacher has ticked as returned at pack-down.
 *
 * The headcount out — how many left the cupboard, how many are back, and the names of
 * any still missing. Outside the Logbook; scoped to the lesson so ticks reset next period.
 */
export interface CraftReturnedState {
  readonly lessonId: string
  /** Drone IDs ticked returned. Display order follows the craft list, never this. */
  readonly returned: readonly DroneId[]
}

export function emptyCraftReturned(lessonId: string): CraftReturnedState {
  return { lessonId, returned: [] }
}

export function ensureCraftReturnedLesson(
  state: CraftReturnedState,
  lessonId: string,
): CraftReturnedState {
  if (state.lessonId === lessonId) return state
  return emptyCraftReturned(lessonId)
}

export function isCraftReturned(state: CraftReturnedState, droneId: DroneId): boolean {
  return state.returned.includes(droneId)
}

export function toggleCraftReturned(
  state: CraftReturnedState,
  droneId: DroneId,
): CraftReturnedState {
  if (state.returned.includes(droneId)) {
    return { ...state, returned: state.returned.filter((id) => id !== droneId) }
  }
  return { ...state, returned: [...state.returned, droneId] }
}

export function setCraftReturned(
  state: CraftReturnedState,
  droneId: DroneId,
  returned: boolean,
): CraftReturnedState {
  const already = state.returned.includes(droneId)
  if (returned === already) return state
  return toggleCraftReturned(state, droneId)
}

/**
 * The headcount out: total that went out, how many are back, and missing craft named.
 *
 * Acceptance: the headcount out, with any craft still missing named.
 */
export function craftReturnedHeadcount(
  state: CraftReturnedState,
  crafts: readonly CraftRef[],
): {
  readonly out: number
  readonly returned: number
  readonly missing: readonly CraftRef[]
} {
  const back = new Set(state.returned)
  const missing = crafts.filter((craft) => !back.has(craft.droneId))
  const returned = crafts.length - missing.length
  return { out: crafts.length, returned, missing }
}
