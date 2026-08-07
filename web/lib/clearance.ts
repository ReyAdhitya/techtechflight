import type { DroneId, Status } from '@techtechflight/contract'
import type { Mission } from './mission.ts'

/**
 * Takeoff Clearances — Teacher records, never Commands (ADR-0021).
 *
 * A Drone that is Ready, assigned and past its pre-flight check enters *Awaiting clearance*
 * on its own. The Teacher grants or holds; nothing travels to the ground station and nothing
 * reaches an aircraft. Grants are per team per Mission, recorded with who and when, and they
 * end when the Mission ends.
 */

export interface ClearanceRecord {
  readonly droneId: DroneId
  readonly missionId: string
  readonly requestedAt: number
  readonly grantedAt: number | null
  readonly grantedBy: string | null
  /**
   * When the Teacher held this request, and who held it.
   *
   * Held is not refused and it is not still waiting. A team the Teacher has answered with
   * "not yet" reads differently on both boards from one nobody has looked at, which is the
   * distinction `holdSeatClearance` already makes on the Student's tablet. There is no
   * release: granting is what supersedes a hold, so the Teacher has two answers rather
   * than three.
   */
  readonly heldAt: number | null
  readonly heldBy: string | null
  /** Set when the Mission ends: the clearance no longer applies. */
  readonly endedAt: number | null
}

/** A craft in the Teacher's clearance queue — requested, not yet granted. */
export type ClearanceRequest = ClearanceRecord & {
  readonly grantedAt: null
  readonly grantedBy: null
  readonly endedAt: null
}

export interface ClearanceState {
  readonly records: readonly ClearanceRecord[]
}

/** What the board knows about one craft when deciding whether it belongs in the queue. */
export interface ClearanceCraftInput {
  readonly droneId: DroneId
  readonly status: Status
  /** Assigned Student id, or null when nobody is paired. */
  readonly studentId: string | null
  /** The Teacher has ticked this Drone's pre-flight check. */
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

function openRecord(
  state: ClearanceState,
  droneId: DroneId,
  missionId: string,
): ClearanceRecord | null {
  let found: ClearanceRecord | null = null
  for (const record of state.records) {
    if (record.droneId !== droneId || record.missionId !== missionId) continue
    if (record.endedAt !== null) continue
    if (found === null || record.requestedAt > found.requestedAt) found = record
  }
  return found
}

function pendingRecord(
  state: ClearanceState,
  droneId: DroneId,
  missionId: string,
): ClearanceRequest | null {
  const record = openRecord(state, droneId, missionId)
  if (record === null || record.grantedAt !== null) return null
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

/**
 * Whether a craft should be awaiting clearance right now.
 *
 * Derived from records the Teacher already made — nobody presses a request button.
 */
export function shouldAwaitClearance(
  input: ClearanceCraftInput,
  state: ClearanceState,
): boolean {
  if (input.status !== 'Ready') return false
  if (input.studentId === null || input.studentId.trim() === '') return false
  if (!input.preFlightDone) return false

  const mission = input.mission
  if (mission === null) return false
  if (!isActiveMission(mission)) return false
  if (!mission.droneIds.includes(input.droneId)) return false
  if (isCleared(state, input.droneId, mission.id)) return false

  return true
}

/**
 * The clearance queue — craft that should be waiting and have not been granted yet.
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
 * The queue fills itself from eligibility — this is what makes the request derived.
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
          heldBy: null,
          endedAt: null,
        },
      ],
    }
  }
  return next
}

/**
 * Grant clearance — records who approved takeoff and when.
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
        record === pending
          ? { ...record, grantedAt: now, grantedBy: trimmed }
          : record,
      ),
    }
  }

  if (isCleared(state, droneId, missionId)) return state

  return {
    records: [
      ...state.records,
      {
        droneId,
        missionId,
        requestedAt: now,
        grantedAt: now,
        grantedBy: trimmed,
        heldAt: null,
        heldBy: null,
        endedAt: null,
      },
    ],
  }
}

/**
 * Hold clearance — records that the Teacher answered, and said not yet.
 *
 * Not a Command, for the same reason granting is not one (ADR-0021): it is addressed to a
 * person, it reaches no aircraft, and the Student is still flying by hand. It is the answer
 * a Teacher had no way to give before, and its absence made a team the Teacher had seen and
 * deliberately kept on the ground indistinguishable from one nobody had looked at.
 *
 * A held request stays in the queue. There is no release: granting supersedes the hold, so
 * a Teacher standing in front of a class has two answers rather than three. Holding one
 * that is already cleared does nothing, because the craft is already up.
 */
export function holdClearance(
  state: ClearanceState,
  droneId: DroneId,
  missionId: string,
  heldBy: string,
  now: number,
): ClearanceState {
  const trimmed = heldBy.trim()
  if (trimmed === '') return state

  const pending = pendingRecord(state, droneId, missionId)
  if (pending === null) return state

  return {
    records: state.records.map((record) =>
      record === pending ? { ...record, heldAt: now, heldBy: trimmed } : record,
    ),
  }
}

/** Whether the Teacher has held this craft's request and not yet granted it. */
export function isHeld(
  state: ClearanceState,
  droneId: DroneId,
  missionId: string,
): boolean {
  const record = openRecord(state, droneId, missionId)
  return record !== null && record.grantedAt === null && record.heldAt !== null
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
        ? { ...record, endedAt: endedAt }
        : record,
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
