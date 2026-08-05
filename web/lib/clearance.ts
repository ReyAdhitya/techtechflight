import type { DroneId, Status } from '@techtechflight/contract'
import type { Mission } from './mission.ts'

/**
 * Takeoff Clearances — Teacher records, never Commands (ADR-0021).
 *
 * Every craft on the active Mission enters *Awaiting clearance* on its own. The Teacher
 * grants takeoff or holds; nothing travels to the ground station and nothing reaches an
 * aircraft. Grants are per craft per Mission, recorded with who and when, and they end
 * when the Mission ends.
 *
 * Ready / assigned / pre-flight used to gate the queue. That left step 6 empty for a
 * Teacher who had not built teams, with six craft sitting on the board and nothing to
 * approve (#616). The queue now fills from the craft themselves.
 */

export interface ClearanceRecord {
  readonly droneId: DroneId
  readonly missionId: string
  readonly requestedAt: number
  readonly grantedAt: number | null
  readonly grantedBy: string | null
  /** Set when the Teacher holds takeoff — the craft leaves the queue without a grant. */
  readonly heldAt: number | null
  /** Set when the Mission ends — the clearance no longer applies. */
  readonly endedAt: number | null
}

/** A craft in the Teacher's clearance queue — requested, not yet granted or held. */
export type ClearanceRequest = ClearanceRecord & {
  readonly grantedAt: null
  readonly grantedBy: null
  readonly heldAt: null
  readonly endedAt: null
}

export interface ClearanceState {
  readonly records: readonly ClearanceRecord[]
}

/** What the board knows about one craft when deciding whether it belongs in the queue. */
export interface ClearanceCraftInput {
  readonly droneId: DroneId
  readonly status: Status
  /** Assigned Student id, or null when nobody is paired. Kept for display, not for entry. */
  readonly studentId: string | null
  /** The Teacher has ticked this Drone's pre-flight check. Kept for display, not for entry. */
  readonly preFlightDone: boolean
  readonly mission: Mission | null
}

export function emptyClearanceState(): ClearanceState {
  return { records: [] }
}

/** A Mission the class is still flying — started and not yet confirmed complete. */
export function isActiveMission(mission: Mission): boolean {
  return mission.startedAt !== null && mission.outcome === null
}

function withHeldAt(record: ClearanceRecord): ClearanceRecord {
  return { ...record, heldAt: record.heldAt ?? null }
}

function openRecord(
  state: ClearanceState,
  droneId: DroneId,
  missionId: string,
): ClearanceRecord | null {
  let found: ClearanceRecord | null = null
  for (const record of state.records) {
    if (record.droneId !== droneId || record.missionId !== missionId) continue
    if (record.endedAt !== null) continue
    const normalised = withHeldAt(record)
    if (found === null || normalised.requestedAt > found.requestedAt) found = normalised
  }
  return found
}

function pendingRecord(
  state: ClearanceState,
  droneId: DroneId,
  missionId: string,
): ClearanceRequest | null {
  const record = openRecord(state, droneId, missionId)
  if (record === null || record.grantedAt !== null || record.heldAt !== null) return null
  return record as ClearanceRequest
}

/** Whether the Teacher has cleared this craft for the active Mission. */
export function isCleared(
  state: ClearanceState,
  droneId: DroneId,
  missionId: string,
): boolean {
  const record = openRecord(state, droneId, missionId)
  return record !== null && record.grantedAt !== null
}

/** Whether the Teacher has held takeoff for this craft on the active Mission. */
export function isHeld(
  state: ClearanceState,
  droneId: DroneId,
  missionId: string,
): boolean {
  const record = openRecord(state, droneId, missionId)
  return record !== null && record.heldAt !== null && record.grantedAt === null
}

/**
 * Whether a craft should be awaiting clearance right now.
 *
 * Derived from the craft the Integrator handed the queue — nobody presses a request
 * button. Which craft are in play is decided upstream (Mission craft, or the whole Fleet
 * when none are named yet), so this only asks whether the Mission is live and the craft
 * is not already granted or held.
 */
export function shouldAwaitClearance(
  input: ClearanceCraftInput,
  state: ClearanceState,
): boolean {
  const mission = input.mission
  if (mission === null) return false
  if (!isActiveMission(mission)) return false
  if (isCleared(state, input.droneId, mission.id)) return false
  if (isHeld(state, input.droneId, mission.id)) return false

  return true
}

/**
 * The clearance queue — craft that should be waiting and have not been granted or held yet.
 *
 * Call `syncClearanceQueue` first so every eligible craft has a `requestedAt` on record.
 */
export function awaitingClearance(
  inputs: readonly ClearanceCraftInput[],
  state: ClearanceState,
): readonly ClearanceRequest[] {
  const queue: ClearanceRequest[] = []
  for (const input of inputs) {
    if (!shouldAwaitClearance(input, state)) continue
    const missionId = input.mission!.id
    const pending = pendingRecord(state, input.droneId, missionId)
    if (pending !== null) queue.push(pending)
  }
  return queue
}

/**
 * Write a clearance request for every craft that should be awaiting but has none yet.
 *
 * The queue fills itself from the craft on the Mission.
 */
export function syncClearanceQueue(
  state: ClearanceState,
  inputs: readonly ClearanceCraftInput[],
  now: number,
): ClearanceState {
  let next = state
  for (const input of inputs) {
    if (!shouldAwaitClearance(input, next)) continue
    const missionId = input.mission!.id
    if (openRecord(next, input.droneId, missionId) !== null) continue
    next = {
      records: [
        ...next.records,
        {
          droneId: input.droneId,
          missionId,
          requestedAt: now,
          grantedAt: null,
          grantedBy: null,
          heldAt: null,
          endedAt: null,
        },
      ],
    }
  }
  return next
}

/**
 * Grant takeoff — records who approved and when.
 *
 * Not a Command. The Student still flies by hand; this is the Teacher's answer on record.
 */
export function grantClearance(
  state: ClearanceState,
  droneId: DroneId,
  missionId: string,
  grantedBy: string,
  now: number,
): ClearanceState {
  const trimmed = grantedBy.trim()
  if (trimmed === '') return state

  const pending = pendingRecord(state, droneId, missionId)
  if (pending !== null) {
    return {
      records: state.records.map((record) =>
        record === pending ||
        (record.droneId === pending.droneId &&
          record.missionId === pending.missionId &&
          record.requestedAt === pending.requestedAt &&
          record.endedAt === null)
          ? {
              ...withHeldAt(record),
              grantedAt: now,
              grantedBy: trimmed,
              heldAt: null,
            }
          : withHeldAt(record),
      ),
    }
  }

  if (isCleared(state, droneId, missionId)) return state

  return {
    records: [
      ...state.records.map(withHeldAt),
      {
        droneId,
        missionId,
        requestedAt: now,
        grantedAt: now,
        grantedBy: trimmed,
        heldAt: null,
        endedAt: null,
      },
    ],
  }
}

/**
 * Hold takeoff — the craft leaves the queue without a grant.
 *
 * Still a record, not a Command. The Teacher is saying not yet; the Student still flies by
 * hand when they are cleared later (a fresh grant can follow once the hold ends with the
 * Mission, or the Teacher grants over an open hold by writing a new grant record).
 */
export function holdClearance(
  state: ClearanceState,
  droneId: DroneId,
  missionId: string,
  now: number,
): ClearanceState {
  const pending = pendingRecord(state, droneId, missionId)
  if (pending !== null) {
    return {
      records: state.records.map((record) =>
        record.droneId === pending.droneId &&
        record.missionId === pending.missionId &&
        record.requestedAt === pending.requestedAt &&
        record.endedAt === null
          ? { ...withHeldAt(record), heldAt: now }
          : withHeldAt(record),
      ),
    }
  }

  if (isCleared(state, droneId, missionId) || isHeld(state, droneId, missionId)) {
    return { records: state.records.map(withHeldAt) }
  }

  return {
    records: [
      ...state.records.map(withHeldAt),
      {
        droneId,
        missionId,
        requestedAt: now,
        grantedAt: null,
        grantedBy: null,
        heldAt: now,
        endedAt: null,
      },
    ],
  }
}

/** End every clearance for a Mission — called when the Mission ends. */
export function endClearancesForMission(
  state: ClearanceState,
  missionId: string,
  endedAt: number,
): ClearanceState {
  return {
    records: state.records.map((record) =>
      record.missionId === missionId && record.endedAt === null
        ? { ...withHeldAt(record), endedAt: endedAt }
        : withHeldAt(record),
    ),
  }
}

/** Whether `missionPhaseFor` should read this craft as cleared for takeoff. */
export function clearedForDrone(
  state: ClearanceState,
  droneId: DroneId,
  mission: Mission | null,
): boolean {
  if (mission === null || !isActiveMission(mission)) return false
  return isCleared(state, droneId, mission.id)
}
