import type { DroneId } from '@techtechflight/contract'
import { assignStudent, readLogbook, runningLesson, saveRoll, startLesson } from './logbook.ts'
import type { Zone } from './airspace.ts'
import type { MissionCheckpoint } from './mission.ts'
import { scenarioOrUnknown } from './mission-scenarios.ts'
import {
  chooseScenario,
  putMission,
  readMission,
  setMissionDrones,
  setMissionZones,
  startMission,
} from './mission-draft.ts'
import { togglePropellersTick } from './preflight-seven.ts'
import { addStudentToTeam, assignDroneToTeam, createTeam, readTeams } from './teams.ts'
import { readClearances, writeClearances } from './clearance-store.ts'
import { grantClearance } from './clearance.ts'
import { persistLessonRecords } from './lesson-records.ts'
import {
  openClassroom,
  seatStudentByHand,
  writeClassroomSession,
} from './classroom-session.ts'

/**
 * Fill a Lesson so every step of the rail opens, because its condition genuinely holds.
 *
 * A demonstration exists so somebody can be shown the product without a class, a set of drones
 * and forty minutes. What it must not become is a set of screens pretending: **the rail's locks
 * are not removed, weakened or bypassed.** They are the product guiding somebody, and a rail
 * that opened step 7 without a granted takeoff would be teaching a lie about what the board
 * does.
 *
 * So this presses what a Teacher presses, in the order a Teacher presses it, through the same
 * functions the screens call. Every step then opens because the fact behind it is true.
 *
 * **It writes the same records any lesson writes.** Nothing is faked and no screen is
 * special-cased, so what a demonstration leaves behind can be opened in Reports and exported to
 * a spreadsheet like any other morning.
 *
 * **It stops on the ground.** An aircraft leaves the ground in exactly one place — the board's
 * answer to a takeoff request, where the simulator plays the child who launches it — and this
 * deliberately does not become a second one. What it leaves is a real classroom moment rather
 * than an impossible one: every request answered, nobody up yet.
 */

/** The children a demonstration invents. Nobody real, and obviously nobody real. */
const CAST = ['Demo Amira', 'Demo Josh', 'Demo Sara'] as const

export const DEMONSTRATION_LABEL = 'Demonstration lesson'

/**
 * The one No-fly Zone, over the desks at the near end of the room.
 *
 * Metres east and north of the Fleet's own origin (ADR-0019). It travels to the tablets as
 * well as to the Scope: step 8 is *Stay out of red*, and a board drawing a zone while the
 * child's screen shows clear air is the two surfaces disagreeing about the one thing that
 * matters.
 */
const SEED_ZONE: Zone = {
  id: 'demo-zone-1',
  kind: 'no-fly',
  name: 'Over the desks',
  points: [
    { eastM: -3, northM: -2 },
    { eastM: -1, northM: -2 },
    { eastM: -1, northM: 0 },
  ],
}

/**
 * The three points the class flies to.
 *
 * **A Mission with no points is a Mission nobody can finish**, and the demonstration shipped
 * without them: `flyRoute` was handed an empty route so nothing left the ground, and
 * `allPointsReached` answered false forever so Approve never appeared. Steps 7 to 10 opened and
 * had nothing in them, which is the failure this seed exists to prevent.
 *
 * Not shared with the two minute demo's route in `demo-mission.ts`. Each demonstration draws
 * its own zone, and points that are clear of one zone are not clear of the other.
 */
const SEED_CHECKPOINTS: readonly MissionCheckpoint[] = [
  { id: 'demo-point-1', name: 'Point 1', at: { eastM: 4, northM: 2 }, radiusM: 0.6, required: true },
  { id: 'demo-point-2', name: 'Point 2', at: { eastM: 4, northM: -2 }, radiusM: 0.6, required: true },
  { id: 'demo-point-3', name: 'Point 3', at: { eastM: 0, northM: 3 }, radiusM: 0.6, required: true },
]

export interface SeedOutcome {
  readonly seeded: boolean
  /** Why it refused, in the words a Teacher reads. Null when it ran. */
  readonly refusedBecause: string | null
  readonly lessonId: string | null
}

/**
 * Whether the roll holds anybody who looks like a real child.
 *
 * **It must be impossible to seed into a real class.** A demonstration writes flights,
 * attendance and points against names, and doing that to a register with actual children in it
 * would put invented mornings into a record a school relies on. The cast is checked by name
 * rather than by a flag, because a flag is a thing that can be absent.
 */
export function rollHoldsRealChildren(names: readonly string[] = readLogbook().roll): boolean {
  const cast = new Set<string>(CAST)
  return names.some((name) => name.trim() !== '' && !cast.has(name.trim()))
}

/**
 * Fill a Lesson end to end, or refuse and say why.
 *
 * `now` is injected so a test can place the demonstration in time rather than racing a clock.
 */
export function seedDemonstration(
  options: {
    readonly now?: number
    /**
     * Tick the safety brief for this Lesson. Step 6 opens on it.
     *
     * Handed in rather than imported, because the brief's rules live in a component module and
     * `web/import-boundaries.test.ts` refuses the logic layer reaching back into the screens.
     * The caller passes `tickAllMissionBriefRules`, which is the same function the button on
     * step 5 calls, so a demonstration and a Teacher leave the same record behind.
     */
    readonly tickBrief?: (lessonId: string) => void
  } = {},
): SeedOutcome {
  const now = options.now ?? Date.now()
  const book = readLogbook()

  if (rollHoldsRealChildren(book.roll)) {
    return {
      seeded: false,
      refusedBecause:
        'This class list has real children on it. Start the demonstration on an empty class, or on a laptop that has never run a lesson.',
      lessonId: null,
    }
  }
  if (runningLesson(book) !== null) {
    return {
      seeded: false,
      refusedBecause: 'A Lesson is already under way. End it first.',
      lessonId: null,
    }
  }

  /* The class, then the Lesson. A Teacher types the roll before the morning starts. */
  saveRoll([...CAST])
  const drones: DroneId[] = ['ttf-0001', 'ttf-0002', 'ttf-0003']
  startLesson(DEMONSTRATION_LABEL, drones.length, drones.length, now, [])
  const lesson = runningLesson(readLogbook())
  if (lesson === null) {
    return { seeded: false, refusedBecause: 'The Lesson would not start.', lessonId: null }
  }

  /* Step 1: the Scenario. Steps 2 and 3 open on it. */
  chooseScenario(lesson.id, 'search-rescue')

  /* Step 2: a zone, drawn where the Scope draws. Optional, and a demonstration shows one. */
  setMissionZones(lesson.id, [SEED_ZONE])

  /*
   * The points, which are the task itself. Written straight onto the Mission because there is
   * no screen that draws them yet; everything else here presses a button a Teacher presses.
   */
  const planned = readMission(lesson.id)
  if (planned !== null) {
    putMission(lesson.id, { ...planned, checkpoints: [...SEED_CHECKPOINTS] })
  }

  /* Step 3: teams on craft, and the children on the teams. Step 4 opens on this. */
  const roster = readLogbook().roster
  drones.forEach((droneId, index) => {
    const name = CAST[index] ?? CAST[0]
    createTeam(`Demo Team ${index + 1}`)
    const team = readTeams().at(-1)
    if (!team) return
    assignDroneToTeam(team.id, droneId)
    const student = roster.find((row) => row.name === name)
    if (student) addStudentToTeam(team.id, student.studentId)
    assignStudent(droneId, name)
  })
  setMissionDrones(lesson.id, drones)

  /* Step 4: the one human tick, on every craft. Step 5 opens on this. */
  for (const droneId of drones) togglePropellersTick(lesson.id, droneId)

  /* Step 5: the brief said out loud, all of it. Step 6 opens on this. */
  options.tickBrief?.(lesson.id)

  /*
   * The classroom, so children have somewhere to join.
   *
   * The figures come from the Scenario and the Mission rather than being typed here.
   * `limitMinutes` was a hard 12 while the Scenario's own default is 8, so the tablet and the
   * team brief printed different lengths for the same Mission until the board next mounted and
   * quietly corrected one of them. `ClassroomOpen` rewrites this session from the Mission the
   * moment a Teacher opens the board; what it writes and what this writes must not differ,
   * because a tablet can join in the seconds before that.
   */
  const scenario = scenarioOrUnknown('search-rescue')
  const session = openClassroom({
    lessonId: lesson.id,
    lessonLabel: DEMONSTRATION_LABEL,
    scenarioId: 'search-rescue',
    scenarioName: scenario.name,
    objective: scenario.objective,
    rules: [],
    limitMinutes: scenario.defaultLimitMinutes,
    checkpointCount: SEED_CHECKPOINTS.length,
    checkpoints: SEED_CHECKPOINTS,
    zones: [SEED_ZONE],
    drones: drones.map((droneId, index) => ({
      droneId,
      droneName: `Drone ${index + 1}`,
      number: index + 1,
    })),
    now,
  })

  /*
   * The children, seated by the Teacher rather than joining from tablets.
   *
   * `seatStudentByHand` is the function a Teacher uses when a child is flying without a screen,
   * and it is the honest path for a demonstration: there are no tablets in the room. Joining
   * three times from one browser would not have worked anyway -- `joinClassroomAsStudent` finds
   * this device's own seat and renames it, so all three children became one.
   */
  let carried = session
  CAST.forEach((name, index) => {
    const droneId = drones[index]
    if (!droneId) return
    carried = seatStudentByHand(carried, droneId, name, now + index)
  })
  writeClassroomSession(carried)

  /*
   * Step 6: the Mission under way and a granted takeoff, which is what opens steps 7 to 11.
   *
   * `startMission` is what `isUnderWay` reads, and a clearance is what step 6's own done string
   * reads. Both, because a rail showing one without the other is a rail arguing with itself.
   */
  const mission = startMission(lesson.id, now)
  if (mission !== null) {
    let clearances = readClearances(lesson.id)
    for (const droneId of drones) {
      clearances = grantClearance(clearances, droneId, mission.id, 'Teacher', now)
    }
    writeClearances(lesson.id, clearances)
  }

  persistLessonRecords(lesson.id)
  return { seeded: true, refusedBecause: null, lessonId: lesson.id }
}
