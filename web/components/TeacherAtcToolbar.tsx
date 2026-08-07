'use client'

import type { CommandKind } from '@techtechflight/contract'
import type { Mission } from '@/lib/mission'
import { cn } from '@/lib/utils'
import type { InstructionCraftOption } from './InstructionControls'
import {
  recordReprioritiseInstruction,
  recordRerouteInstruction,
} from './InstructionControls'
import type { MissionWithInstructions } from './AssignTargetControl'

/**
 * Teacher ATC bar — poster intents, ADR-0021 kinds.
 *
 * Approve takeoff scrolls to the clearance queue (a Clearance, not a Command).
 * Pause / Recall / Stop are Commands to the simulated Fleet only.
 * New Target / Reroute / Reprioritise are Instructions (records).
 * Add NFZ is an airspace edit — Teacher draws on Scope / Lesson.
 */
export function TeacherAtcToolbar({
  mission,
  selectedCraft,
  airborneCount,
  givenBy,
  onCommandFleet,
  onMissionChange,
  onFocusClearance,
  onFocusScope,
  onFocusNewTarget,
}: {
  readonly mission: Mission | null
  readonly selectedCraft: InstructionCraftOption | null
  readonly airborneCount: number
  readonly givenBy: string
  readonly onCommandFleet: (kind: CommandKind) => void
  readonly onMissionChange: (mission: MissionWithInstructions) => void
  readonly onFocusClearance: () => void
  readonly onFocusScope: () => void
  readonly onFocusNewTarget: () => void
}) {
  const live = mission !== null && mission.startedAt !== null && mission.outcome === null
  const craft = selectedCraft
  const canInstruct = live && craft !== null

  const instruct = (kind: 'reroute' | 'reprioritise') => {
    if (!canInstruct || mission === null || craft === null) return
    const at = Date.now()
    const next =
      kind === 'reroute'
        ? recordRerouteInstruction(mission, { craft, givenBy, at })
        : recordReprioritiseInstruction(mission, { craft, givenBy, at })
    onMissionChange(next)
  }

  const btn =
    'min-h-11 cursor-pointer rounded-pill border border-hairline bg-surface-1 px-4 py-1.5 text-value text-ink hover:border-ink disabled:cursor-not-allowed disabled:text-ink-muted disabled:hover:border-hairline'

  return (
    <section
      className="flex flex-col gap-2 border-y border-hairline py-3"
      aria-label="Teacher ATC actions"
    >
      <h2 className="label m-0">Teacher actions</h2>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={btn} onClick={onFocusClearance} disabled={!live}>
          Approve takeoff
        </button>
        <button
          type="button"
          className={btn}
          disabled={airborneCount === 0}
          onClick={() => onCommandFleet('hold')}
        >
          Pause
        </button>
        <button
          type="button"
          className={btn}
          disabled={airborneCount === 0}
          onClick={() => onCommandFleet('return-home')}
        >
          Recall
        </button>
        <button
          type="button"
          className={cn(btn, 'border-status-fault text-status-fault')}
          disabled={airborneCount === 0}
          onClick={() => onCommandFleet('emergency-stop')}
        >
          Stop
        </button>
        <button type="button" className={btn} onClick={onFocusScope} disabled={mission === null}>
          Add no-fly zone
        </button>
        <button type="button" className={btn} onClick={onFocusNewTarget} disabled={!canInstruct}>
          New target
        </button>
        <button
          type="button"
          className={btn}
          disabled={!canInstruct}
          onClick={() => instruct('reprioritise')}
        >
          Reprioritise
        </button>
        <button
          type="button"
          className={btn}
          disabled={!canInstruct}
          onClick={() => instruct('reroute')}
        >
          Reroute
        </button>
      </div>
      {!craft && live ? (
        <p className="m-0 text-value text-ink-muted">
          Select a craft for New target, Reprioritise, or Reroute.
        </p>
      ) : null}
    </section>
  )
}
