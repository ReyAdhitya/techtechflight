'use client'

import type { DroneId } from '@techtechflight/contract'
import { debriefFor, scoreMission, type MissionScoreEvidence } from '@/lib/mission-score'
import {
  type Mission,
  type MissionOutcome,
  type SuccessCriterion,
} from '@/lib/mission'
import { cn } from '@/lib/utils'

/**
 * Confirm mission complete — seals the Mission and its score once every craft is down.
 *
 * Refuses while any Mission craft is still airborne. Scoring uses observed evidence only;
 * the Integrator gathers that from the run. Not a Command (ADR-0021).
 */

export interface MissionCraftStatus {
  readonly droneId: DroneId
  readonly droneName: string
  readonly airborne: boolean
}

export interface ConfirmMissionInput {
  readonly mission: Mission
  readonly craft: readonly MissionCraftStatus[]
  readonly judges: readonly SuccessCriterion[]
  readonly evidence: MissionScoreEvidence
  readonly now: number
}

/** True when every craft on this Mission is on the ground and it is not already sealed. */
export function canConfirmMissionComplete(
  mission: Mission,
  craft: readonly MissionCraftStatus[],
): boolean {
  if (mission.startedAt === null || mission.outcome !== null) return false
  if (mission.droneIds.length === 0) return false

  const byId = new Map(craft.map((entry) => [entry.droneId, entry.airborne]))
  for (const droneId of mission.droneIds) {
    if (byId.get(droneId) !== false) return false
  }
  return true
}

/** Names of Mission craft still airborne — for the refusal message. */
export function airborneMissionCraft(
  mission: Mission,
  craft: readonly MissionCraftStatus[],
): readonly MissionCraftStatus[] {
  const missionSet = new Set(mission.droneIds)
  return craft.filter((entry) => missionSet.has(entry.droneId) && entry.airborne)
}

/** Seal the Mission outcome and score. Call only when `canConfirmMissionComplete` is true. */
export function sealMissionComplete(input: ConfirmMissionInput): Mission {
  const result = scoreMission({ judges: input.judges, evidence: input.evidence })
  const outcome: MissionOutcome = {
    endedAt: input.now,
    criteria: result.criteria,
    failures: result.failures,
    score: result.score,
    debrief: debriefFor(result),
  }
  return { ...input.mission, outcome }
}

export function ConfirmMissionComplete({
  mission,
  craft,
  judges,
  evidence,
  disabled = false,
  onConfirmed,
}: {
  readonly mission: Mission
  readonly craft: readonly MissionCraftStatus[]
  readonly judges: readonly SuccessCriterion[]
  readonly evidence: MissionScoreEvidence
  readonly disabled?: boolean
  readonly onConfirmed?: (mission: Mission) => void
}) {
  const canConfirm = canConfirmMissionComplete(mission, craft) && !disabled
  const stillAirborne = airborneMissionCraft(mission, craft)
  const alreadySealed = mission.outcome !== null

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={!canConfirm}
        onClick={() => {
          if (!canConfirm) return
          const next = sealMissionComplete({
            mission,
            craft,
            judges,
            evidence,
            now: Date.now(),
          })
          onConfirmed?.(next)
        }}
        className={cn(
          'min-h-11 w-fit cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink',
          'hover:border-ink disabled:cursor-not-allowed disabled:text-ink-muted disabled:hover:border-hairline',
        )}
      >
        Confirm mission complete
      </button>

      {alreadySealed ? (
        <p className="m-0 text-value text-ink-subtle" role="status">
          Mission sealed
          {mission.outcome?.score !== null && mission.outcome?.score !== undefined ? (
            <>
              {', score '}
              <span className="tnum">{Math.round(mission.outcome.score * 100)}</span>%
            </>
          ) : null}
          {mission.outcome?.debrief ? `, ${mission.outcome.debrief}` : null}
        </p>
      ) : stillAirborne.length > 0 ? (
        <p className="m-0 text-value text-status-not-ready" role="status">
          Still airborne: {stillAirborne.map((entry) => entry.droneName).join(', ')}. Confirm
          only when every Drone is down.
        </p>
      ) : mission.startedAt === null ? (
        <p className="m-0 text-value text-ink-muted" role="status">
          Start the Mission before confirming completion.
        </p>
      ) : null}
    </div>
  )
}
