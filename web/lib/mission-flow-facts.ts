import type { DroneId, FleetThresholds, Telemetry } from '@techtechflight/contract'
import { DEFAULT_THRESHOLDS } from '@techtechflight/contract'
import { anyClearanceGranted } from './clearance-store.ts'
import type { ClearanceState } from './clearance.ts'
import { hasMissionZone } from './mission-draft.ts'
import type { MissionFlowFacts } from './mission-flow.ts'
import { noMissionYet } from './mission-flow.ts'
import type { Mission } from './mission.ts'
import {
  evaluatePreFlightSeven,
  isPreFlightSevenDone,
  propellersTicked,
  type PreFlightSevenState,
} from './preflight-seven.ts'
import type { Team } from './teams.ts'

/**
 * The twelve-step rail's reading of the records, in one place.
 *
 * Three screens carry the rail and every one of them must agree about where the Teacher
 * is. Gathering the facts on each screen separately is how they would drift, so the
 * gathering is here and takes only what a screen already has to hand.
 */

export interface MissionFlowInput {
  readonly mission: Mission | null
  readonly teams: readonly Team[]
  readonly preFlight: PreFlightSevenState
  /** Every rule of the safety brief ticked. */
  readonly briefed: boolean
  readonly clearances: ClearanceState
  /** Telemetry for one craft, or null when it is not reporting. */
  readonly telemetryFor: (droneId: DroneId) => Telemetry | null
  readonly anyAirborne: boolean
  /** True on Reports, where the debrief is read. */
  readonly reviewed?: boolean
  readonly thresholds?: FleetThresholds
}

/**
 * Which craft this Mission is being flown by.
 *
 * Teams are the source. A Mission's own `droneIds` is written from the same teams, and
 * reading teams here means the rail is right the moment a team takes a craft rather than
 * one write later.
 */
export function missionCraftIds(
  teams: readonly Team[],
  mission: Mission | null,
): readonly DroneId[] {
  const fromTeams = teams
    .map((team) => team.droneId)
    .filter((droneId): droneId is DroneId => droneId !== null)
  if (fromTeams.length > 0) return fromTeams
  return mission?.droneIds ?? []
}

export function missionFlowFactsFrom(input: MissionFlowInput): MissionFlowFacts {
  const mission = input.mission
  if (mission === null) {
    return { ...noMissionYet(), airborne: input.anyAirborne }
  }

  const craftIds = missionCraftIds(input.teams, mission)
  const thresholds = input.thresholds ?? DEFAULT_THRESHOLDS

  const preFlightPassed = craftIds.some((droneId) =>
    isPreFlightSevenDone(
      evaluatePreFlightSeven(
        input.telemetryFor(droneId),
        propellersTicked(input.preFlight, droneId),
        thresholds,
      ),
    ),
  )

  return {
    scenarioChosen: true,
    missionZoneDrawn: hasMissionZone(mission),
    teamOnCraft: craftIds.length > 0,
    preFlightPassed,
    briefed: input.briefed,
    cleared: anyClearanceGranted(input.clearances, mission.id),
    airborne: input.anyAirborne,
    sealed: mission.outcome !== null,
    reviewed: input.reviewed === true,
  }
}
