import type { DroneId } from '@techtechflight/contract'
import { assignStudent, readLogbook, runningLesson, saveRoll, startLesson } from './logbook.ts'
import { chooseScenario, setMissionDrones, setMissionZones, startMission } from './mission-draft.ts'
import { togglePropellersTick } from './preflight-seven.ts'
import { addStudentToTeam, assignDroneToTeam, createTeam, readTeams } from './teams.ts'
import { readClearances, writeClearances } from './clearance-store.ts'
import { grantClearance } from './clearance.ts'
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
 */

/** The children a demonstration invents. Nobody real, and obviously nobody real. */
const CAST = ['Demo Amira', 'Demo Josh', 'Demo Sara'] as const

export const DEMONSTRATION_LABEL = 'Demonstration lesson'

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
  setMissionZones(lesson.id, [
    {
      id: 'demo-zone-1',
      kind: 'no-fly',
      name: 'Over the desks',
      points: [
        { eastM: -3, northM: -2 },
        { eastM: -1, northM: -2 },
        { eastM: -1, northM: 0 },
      ],
    },
  ])

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

  /* The classroom, so children have somewhere to join. */
  const session = openClassroom({
    lessonId: lesson.id,
    lessonLabel: DEMONSTRATION_LABEL,
    scenarioId: 'search-rescue',
    scenarioName: 'Search and Rescue',
    objective: 'Locate a target and reach or identify the correct area.',
    rules: [],
    limitMinutes: 12,
    zones: [],
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

  return { seeded: true, refusedBecause: null, lessonId: lesson.id }
}
