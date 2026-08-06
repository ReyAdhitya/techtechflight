'use client'

import { useState } from 'react'
import type { DroneId, LocalPosition } from '@techtechflight/contract'
import type { Mission } from '@/lib/mission'
import { cn } from '@/lib/utils'

/**
 * Assign a new target — an Instruction to a team, never a Command (ADR-0021).
 *
 * The Integrator passes a Scope tap as `pickedPosition` and the team list; this control
 * records who was told what and when. Works on real hardware because nothing reaches the
 * ground station.
 */

export type InstructionKind = 'assign-target' | 'reroute' | 'reprioritise'

export interface MissionInstruction {
  readonly id: string
  readonly kind: InstructionKind
  /** The craft strip this Instruction applies to. */
  readonly droneId: DroneId
  readonly teamId: string | null
  readonly teamName: string | null
  readonly at: number
  readonly givenBy: string
  readonly detail: string
  readonly atPosition?: LocalPosition
}

export type MissionWithInstructions = Mission & {
  readonly instructions?: readonly MissionInstruction[]
}

export interface AssignTargetTeamOption {
  readonly teamId: string
  readonly teamName: string
  readonly droneId: DroneId
}

export function instructionsForDrone(
  mission: MissionWithInstructions,
  droneId: DroneId,
): readonly MissionInstruction[] {
  return (mission.instructions ?? []).filter((row) => row.droneId === droneId)
}

export function instructionWords(instruction: MissionInstruction): string {
  switch (instruction.kind) {
    case 'assign-target':
      return instruction.atPosition
        ? `New target at ${formatMetres(instruction.atPosition.eastM)} east, ${formatMetres(instruction.atPosition.northM)} north`
        : 'New target assigned'
    case 'reroute':
      return 'Reroute'
    case 'reprioritise':
      return 'Reprioritised'
  }
}

function formatMetres(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function nextInstructionId(mission: MissionWithInstructions): string {
  const count = mission.instructions?.length ?? 0
  return `instruction-${count + 1}`
}

/** Record an assign-target Instruction on the Mission — not a Command. */
export function recordAssignTargetInstruction(
  mission: MissionWithInstructions,
  input: {
    readonly team: AssignTargetTeamOption
    readonly position: LocalPosition
    readonly givenBy: string
    readonly at: number
  },
): MissionWithInstructions {
  const givenBy = input.givenBy.trim()
  if (givenBy === '') return mission

  const instruction: MissionInstruction = {
    id: nextInstructionId(mission),
    kind: 'assign-target',
    droneId: input.team.droneId,
    teamId: input.team.teamId,
    teamName: input.team.teamName,
    at: input.at,
    givenBy,
    atPosition: input.position,
    detail: `${input.team.teamName}: new target at ${formatMetres(input.position.eastM)} m east, ${formatMetres(input.position.northM)} m north`,
  }

  return {
    ...mission,
    instructions: [...(mission.instructions ?? []), instruction],
  }
}

export function AssignTargetControl({
  mission,
  pickedPosition,
  teams,
  givenBy,
  disabled = false,
  onRecorded,
}: {
  readonly mission: MissionWithInstructions
  /** A tap on the Scope, or null when nothing is picked yet. */
  readonly pickedPosition: LocalPosition | null
  readonly teams: readonly AssignTargetTeamOption[]
  readonly givenBy: string
  readonly disabled?: boolean
  readonly onRecorded?: (mission: MissionWithInstructions) => void
}) {
  const [teamId, setTeamId] = useState('')

  const selectedTeam = teams.find((team) => team.teamId === teamId) ?? null
  const canAssign =
    !disabled &&
    pickedPosition !== null &&
    selectedTeam !== null &&
    mission.startedAt !== null &&
    mission.outcome === null

  const stripInstructions = selectedTeam
    ? instructionsForDrone(mission, selectedTeam.droneId)
    : []

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        <p className="m-0 min-w-0 flex-1 text-value text-ink-subtle" role="status">
          {pickedPosition === null ? (
            'Tap the Scope to pick where the new target is.'
          ) : (
            <>
              Target at{' '}
              <span className="tnum">{formatMetres(pickedPosition.eastM)}</span> m east,{' '}
              <span className="tnum">{formatMetres(pickedPosition.northM)}</span> m north.
            </>
          )}
        </p>

        <label className="flex flex-col gap-1">
          <span className="label">Team</span>
          <select
            value={teamId}
            disabled={disabled || teams.length === 0}
            onChange={(event) => setTeamId(event.target.value)}
            className="min-h-11 min-w-40 rounded-pill border border-hairline bg-canvas px-3 py-1 text-value text-ink disabled:cursor-not-allowed disabled:text-ink-muted"
          >
            <option value="">Choose a team</option>
            {teams.map((team) => (
              <option key={team.teamId} value={team.teamId}>
                {team.teamName}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          disabled={!canAssign}
          onClick={() => {
            if (!canAssign || pickedPosition === null || selectedTeam === null) return
            const next = recordAssignTargetInstruction(mission, {
              team: selectedTeam,
              position: pickedPosition,
              givenBy,
              at: Date.now(),
            })
            onRecorded?.(next)
            setTeamId('')
          }}
          className={cn(
            'min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink',
            'hover:border-ink disabled:cursor-not-allowed disabled:text-ink-muted disabled:hover:border-hairline',
          )}
        >
          Assign target
        </button>
      </div>

      {teams.length === 0 ? (
        <p className="m-0 text-value text-ink-muted">Add Mission teams before assigning a target.</p>
      ) : null}

      {stripInstructions.length > 0 ? (
        <InstructionStripList instructions={stripInstructions} heading="Instructions on this strip" />
      ) : null}
    </div>
  )
}

/** Visible on the strip — when each Instruction was given (ADR-0021). */
export function InstructionStripList({
  instructions,
  heading = 'Instructions',
}: {
  readonly instructions: readonly MissionInstruction[]
  readonly heading?: string
}) {
  if (instructions.length === 0) return null

  return (
    <div className="flex flex-col gap-1">
      <span className="label">{heading}</span>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {[...instructions].reverse().map((row) => (
          <li
            key={row.id}
            className="rounded-sm border border-hairline bg-canvas px-3 py-2 text-value text-ink-subtle"
          >
            <span className="font-display font-medium text-ink">{instructionWords(row)}</span>
            {' · '}
            <span className="tnum">{formatClock(row.at)}</span>
            {row.teamName ? ` · ${row.teamName}` : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function formatClock(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}
