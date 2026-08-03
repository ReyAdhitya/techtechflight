import type { DroneId } from '@techtechflight/contract'

/** One battery pack identified by the craft it flew — the name a Teacher says out loud. */
export interface BatteryPackRef {
  readonly droneId: DroneId
  readonly droneName: string
}

/**
 * Which packs the Teacher has marked back on charge at pack-down.
 *
 * Outside the Logbook: this is a closing ritual for the cupboard, not a Student record.
 * Scoped to `lessonId` so a later lesson does not inherit earlier ticks.
 */
export interface BatteryOnChargeState {
  readonly lessonId: string
  /** Drone IDs whose packs are on charge. Display order follows the pack list, never this. */
  readonly onCharge: readonly DroneId[]
}

export function emptyBatteryOnCharge(lessonId: string): BatteryOnChargeState {
  return { lessonId, onCharge: [] }
}

/** Fresh ticks when the lesson changes — Period 4 must not inherit Period 3. */
export function ensureBatteryOnChargeLesson(
  state: BatteryOnChargeState,
  lessonId: string,
): BatteryOnChargeState {
  if (state.lessonId === lessonId) return state
  return emptyBatteryOnCharge(lessonId)
}

export function isBatteryOnCharge(
  state: BatteryOnChargeState,
  droneId: DroneId,
): boolean {
  return state.onCharge.includes(droneId)
}

export function toggleBatteryOnCharge(
  state: BatteryOnChargeState,
  droneId: DroneId,
): BatteryOnChargeState {
  if (state.onCharge.includes(droneId)) {
    return { ...state, onCharge: state.onCharge.filter((id) => id !== droneId) }
  }
  return { ...state, onCharge: [...state.onCharge, droneId] }
}

export function setBatteryOnCharge(
  state: BatteryOnChargeState,
  droneId: DroneId,
  onCharge: boolean,
): BatteryOnChargeState {
  const already = state.onCharge.includes(droneId)
  if (onCharge === already) return state
  return toggleBatteryOnCharge(state, droneId)
}

/** Which packs are recorded on charge — and which still need placing. */
export function batteryOnChargeSummary(
  state: BatteryOnChargeState,
  packs: readonly BatteryPackRef[],
): {
  readonly onCharge: readonly BatteryPackRef[]
  readonly stillOut: readonly BatteryPackRef[]
  readonly onChargeCount: number
  readonly total: number
} {
  const charged = new Set(state.onCharge)
  const onChargeList = packs.filter((pack) => charged.has(pack.droneId))
  const stillOut = packs.filter((pack) => !charged.has(pack.droneId))
  return {
    onCharge: onChargeList,
    stillOut,
    onChargeCount: onChargeList.length,
    total: packs.length,
  }
}
