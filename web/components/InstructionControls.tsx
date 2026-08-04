'use client'

import type { DroneId } from '@techtechflight/contract'
import {
  InstructionStripList,
  instructionWords,
  type MissionInstruction,
  type MissionWithInstructions,
} from './AssignTargetControl'
import { cn } from '@/lib/utils'

/**
 * Reroute and reprioritise — Instructions recorded on the Mission strip (ADR-0021).
 *
 * Both are facts the Teacher writes for a team mid-Mission. Nothing reaches the ground
 * station; a debrief can read when each was given from the strip list.
 */

export interface InstructionCraftOption {
  readonly droneId: DroneId
  readonly droneName: string
  readonly teamId: string | null
  readonly teamName: string | null
}

function nextInstructionId(mission: MissionWithInstructions): string {
  const count = mission.instructions?.length ?? 0
  return `instruction-${count + 1}`
}

function appendInstruction(
  mission: MissionWithInstructions,
  row: Omit<MissionInstruction, 'id'>,
): MissionWithInstructions {
  return {
    ...mission,
    instructions: [
      ...(mission.instructions ?? []),
      { ...row, id: nextInstructionId(mission) },
    ],
  }
}

/** Record a reroute Instruction for one craft's strip. */
export function recordRerouteInstruction(
  mission: MissionWithInstructions,
  input: {
    readonly craft: InstructionCraftOption
    readonly givenBy: string
    readonly at: number
    readonly detail?: string
  },
): MissionWithInstructions {
  const givenBy = input.givenBy.trim()
  if (givenBy === '') return mission

  const teamLabel = input.craft.teamName ?? input.craft.droneName
  const detail = input.detail?.trim() || `${teamLabel}: fly a new route`

  return appendInstruction(mission, {
    kind: 'reroute',
    droneId: input.craft.droneId,
    teamId: input.craft.teamId,
    teamName: input.craft.teamName,
    at: input.at,
    givenBy,
    detail,
  })
}

/** Record a reprioritise Instruction for one craft's strip. */
export function recordReprioritiseInstruction(
  mission: MissionWithInstructions,
  input: {
    readonly craft: InstructionCraftOption
    readonly givenBy: string
    readonly at: number
    readonly detail?: string
  },
): MissionWithInstructions {
  const givenBy = input.givenBy.trim()
  if (givenBy === '') return mission

  const teamLabel = input.craft.teamName ?? input.craft.droneName
  const detail = input.detail?.trim() || `${teamLabel}: change the order of work`

  return appendInstruction(mission, {
    kind: 'reprioritise',
    droneId: input.craft.droneId,
    teamId: input.craft.teamId,
    teamName: input.craft.teamName,
    at: input.at,
    givenBy,
    detail,
  })
}

export function instructionsForStrip(
  mission: MissionWithInstructions,
  droneId: DroneId,
): readonly MissionInstruction[] {
  return (mission.instructions ?? []).filter((row) => row.droneId === droneId)
}

export function InstructionControls({
  mission,
  craft,
  givenBy,
  disabled = false,
  onRecorded,
}: {
  readonly mission: MissionWithInstructions
  readonly craft: InstructionCraftOption
  readonly givenBy: string
  readonly disabled?: boolean
  readonly onRecorded?: (mission: MissionWithInstructions) => void
}) {
  const missionLive = mission.startedAt !== null && mission.outcome === null
  const canRecord = !disabled && missionLive
  const stripInstructions = instructionsForStrip(mission, craft.droneId)

  const record = (kind: 'reroute' | 'reprioritise') => {
    if (!canRecord) return
    const at = Date.now()
    const next =
      kind === 'reroute'
        ? recordRerouteInstruction(mission, { craft, givenBy, at })
        : recordReprioritiseInstruction(mission, { craft, givenBy, at })
    onRecorded?.(next)
  }

  const craftLabel = craft.teamName ?? craft.droneName

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="label">Instructions for {craftLabel}</span>
        <button
          type="button"
          disabled={!canRecord}
          onClick={() => record('reroute')}
          className={cn(
            'min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink',
            'hover:border-ink disabled:cursor-not-allowed disabled:text-ink-muted disabled:hover:border-hairline',
          )}
        >
          Reroute
        </button>
        <button
          type="button"
          disabled={!canRecord}
          onClick={() => record('reprioritise')}
          className={cn(
            'min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink',
            'hover:border-ink disabled:cursor-not-allowed disabled:text-ink-muted disabled:hover:border-hairline',
          )}
        >
          Reprioritise
        </button>
      </div>

      {!missionLive ? (
        <p className="m-0 text-value text-ink-muted">
          Instructions can be recorded once the Mission has started.
        </p>
      ) : null}

      {stripInstructions.length > 0 ? (
        <InstructionStripList
          instructions={stripInstructions}
          heading="Recorded on this strip"
        />
      ) : (
        <p className="m-0 text-value text-ink-muted">
          No reroute or reprioritise recorded yet for {craftLabel}.
        </p>
      )}
    </div>
  )
}

export { instructionWords }
