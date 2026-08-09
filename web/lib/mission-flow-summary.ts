import { formatClock } from './telemetry-presentation.ts'

/**
 * What a step decided, in the few words the rail has room for.
 *
 * A tick tells a Teacher that they did something. It does not tell them *what they chose*,
 * which is the question they are actually asking when they glance back up the rail
 * mid-lesson. So a finished step reads "Search and Rescue", not "Done", and a live step
 * reads "3 airborne" rather than pretending to be finished at all.
 *
 * Separate from `mission-flow.ts` because these need counts, and that module deliberately
 * takes only booleans so no screen can put the rail somewhere the records disagree with.
 * Pure: no React, no storage, no clock of its own. The screen gathers, this phrases.
 *
 * Zero is said in words rather than drawn as a nought, which is the prototype's own
 * convention ("Nothing sent yet"). An absent reading is said as absent, never as zero.
 */

export interface MissionFlowSummary {
  /** What the Teacher picked at step 1, or null before they picked. */
  readonly scenarioName: string | null
  /** No-fly Zones drawn. The go-area is not drawn at all any more (ADR-0027). */
  readonly noFlyZones: number
  readonly teams: number
  /** Craft a team has taken. */
  readonly craft: number
  readonly craftPastPreFlight: number
  readonly briefSectionsTicked: number
  readonly briefSections: number
  readonly awaitingClearance: number
  readonly airborne: number
  /** The craft whose Telemetry is open, or null when the Teacher has picked none. */
  readonly selectedCraftName: string | null
  /** Commands recorded against this Lesson. Records are not counted here. */
  readonly commandsSent: number
  readonly criticalAlerts: number
  /** When the Teacher sealed the Mission, or null while it is unsealed. */
  readonly sealedAt: number | null
}

export function noMissionSummaryYet(): MissionFlowSummary {
  return {
    scenarioName: null,
    noFlyZones: 0,
    teams: 0,
    craft: 0,
    craftPastPreFlight: 0,
    briefSectionsTicked: 0,
    briefSections: 0,
    awaitingClearance: 0,
    airborne: 0,
    selectedCraftName: null,
    commandsSent: 0,
    criticalAlerts: 0,
    sealedAt: null,
  }
}

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`

/**
 * The state line for a step that is not locked: behind the Teacher, live, or open and not
 * started yet.
 *
 * A step that is open and untouched says so in words rather than as a row of noughts.
 * "0 teams, 0 craft" reads as a measurement of a class that has none, and a Teacher has to
 * stop and work out which it meant.
 */
export function missionStepDone(step: number, summary: MissionFlowSummary): string {
  switch (step) {
    case 1:
      return summary.scenarioName ?? 'Not chosen yet'
    case 2:
      return summary.noFlyZones === 0
        ? 'Nothing drawn yet'
        : plural(summary.noFlyZones, 'no-fly zone', 'no-fly zones')
    /*
     * Keyed off Drones, not teams, and that is the fix for a rail that argued with itself.
     * `teamOnCraft` is true as soon as a Drone is on the Mission, and `missionCraftIds`
     * falls back to the Mission's own `droneIds` when no team holds one, so a Teacher who
     * put Drones on a Mission without naming teams got a tick beside "No teams yet".
     *
     * The tick means Drones, so the words mean Drones. Teams are named when there are any,
     * because a Teacher who made four of them wants to see four.
     */
    case 3:
      if (summary.craft === 0) return 'No Drones yet'
      if (summary.teams === 0) return plural(summary.craft, 'Drone', 'Drones')
      return `${plural(summary.teams, 'team', 'teams')}, ${plural(summary.craft, 'Drone', 'Drones')}`
    case 4:
      return summary.craft === 0
        ? 'No Drone on a team yet'
        : `${summary.craftPastPreFlight} of ${summary.craft} past it`
    case 5:
      return `${summary.briefSectionsTicked} of ${summary.briefSections} ticked`
    case 6:
      return summary.awaitingClearance === 0
        ? 'Nobody waiting'
        : `${summary.awaitingClearance} waiting`
    case 7:
      return summary.airborne === 0 ? 'Nothing airborne' : `${summary.airborne} airborne`
    case 8:
      return summary.selectedCraftName === null
        ? 'No Drone selected'
        : `${summary.selectedCraftName} selected`
    case 9:
      return summary.commandsSent === 0 ? 'Nothing sent yet' : `${summary.commandsSent} sent`
    case 10:
      return summary.criticalAlerts === 0
        ? 'Nothing critical'
        : `${summary.criticalAlerts} critical`
    case 11:
      /*
       * Said as the obstacle while there is one. A Teacher looking at step 11 wants to know
       * whether they can seal, and "1 still airborne" answers that where "Not sealed" would
       * only restate the question.
       */
      return summary.airborne === 0
        ? 'Every Drone down'
        : `${summary.airborne} still airborne`
    case 12:
      return summary.sealedAt === null ? 'Not sealed yet' : `Sealed ${formatClock(summary.sealedAt)}`
    default:
      return ''
  }
}
