'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { isUsable, needsAttention, type DroneState } from '@techtechflight/contract'
import {
  isStudentAbsent,
  readLogbook,
  readServerLogbook,
  runningLesson,
  serviceStateOf,
  startLesson,
  studentOf,
  subscribeLogbook,
  type Exercise,
  type LessonRecord,
} from '@/lib/logbook'
import {
  canUndoAssignment,
  undoLastAssignment,
  withAssignmentUndo,
} from '@/lib/assignment-undo'
import {
  markAbsentAndFreeCraft,
  type AbsentReassignResult,
} from '@/lib/absent-reassign'
import { cn } from '@/lib/utils'
import { LessonPrepPanel } from './LessonPrepPanel'
import { SafetyBriefPanel } from './SafetyBriefPanel'
import { WaitingList } from './WaitingList'
import { useFleet } from './FleetProvider'
import { formatElapsed } from './LessonStrip'
import { BeforeAfterScores } from './BeforeAfterScores'
import { LessonWarmUp } from './LessonWarmUp'
import { readyBoardLabel, readyBoardSummary } from './walls/ready-mapping'
import { READING_FRAME } from '@/lib/frame'
import type { DroneVitals } from '@/lib/vitals'
import { LessonBookmarkControl } from './LessonBookmarkControl'
import { LessonIncidentNoteControl } from './LessonIncidentNoteControl'
import { ScenarioPicker } from './ScenarioPicker'
import { MissionAreaEditor } from './MissionAreaEditor'
import { TeamsPanel } from './TeamsPanel'
import { PreFlightSeven } from './PreFlightSeven'
import {
  MissionBriefing,
  isMissionBriefingComplete,
  readMissionBriefing,
} from './MissionBriefing'
import { TeamBriefPrint } from './TeamBriefPrint'
import { StepRail } from './StepRail'
import type { Mission } from '@/lib/mission'
import { readTeams } from '@/lib/teams'
import {
  adoptMissionDraft,
  chooseScenario,
  readMission,
  setMissionDrones,
  setMissionZones,
} from '@/lib/mission-draft'
import { readClearances } from '@/lib/clearance-store'
import { missionCraftIds, missionFlowFactsFrom } from '@/lib/mission-flow-facts'
import {
  MISSION_FLOW_PHASES,
  MISSION_FLOW_STEPS,
  MISSION_STEP_COUNT,
  currentMissionStep,
  isSetUpStep,
} from '@/lib/mission-flow'
import { readPreFlightSeven } from '@/lib/preflight-seven'
import type { FleetSnapshot } from '@/lib/fleet-link'

/**
 * Set this Mission up, and start or end the period. That is the whole screen.
 *
 * It used to be the whole day: Fleet health with a craft-by-craft fault list, finished
 * Lessons, the remedial queue, pack-down, a second copy of the Mission briefing, and two
 * paragraphs on where records are stored. Every one of those answered a question another
 * screen already owns, so a Teacher at 08:55 read past four blocks to reach the step they
 * came for, and each block was a second place for the same fact to go stale.
 *
 * Where they went, and why each one is that screen's question rather than this one's:
 *
 * - Fleet health, craft by craft → the Fleet board, which lists every Drone with its
 *   Status and fault. One line survives here, because "can the period run" is a question
 *   about the period. It links to the list.
 * - Finished Lessons → Reports (`LessonReports`), which already listed the same fields
 *   from the same filter.
 * - The remedial queue → Reports, beside the record of what happened.
 * - Pack-down → Control step 11, under the confirmation that ends the Mission.
 * - The second Mission briefing → step 5, which is the one the rail points at.
 * - Where records live → Settings, which is where a Teacher goes to ask.
 *
 * What is left is the step pane, one line of Fleet health, which craft are in this period
 * (`LessonPrepPanel`), and starting or ending it.
 */
export function LessonScreen() {
  const { snapshot, now, vitals } = useFleet()
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)
  const lesson = runningLesson(book)
  const lessonId = lesson?.id ?? null
  const drones = snapshot.state?.drones ?? []

  const [railOpen, setRailOpen] = useState(true)
  const [mission, setMission] = useState<Mission | null>(null)

  /*
   * Set-up happens before Start, so the Mission is drawn with no Lesson id and adopted by
   * the Lesson that starts. Reading on mount rather than in the initialiser keeps the
   * server render and the first client render agreeing about an empty board.
   */
  useEffect(() => {
    setMission(lessonId === null ? readMission(null) : adoptMissionDraft(lessonId).mission)
  }, [lessonId])

  const requestedStep = Number(useSearchParams().get('step'))
  const teams = readTeams()

  const facts = missionFlowFactsFrom({
    mission,
    teams,
    preFlight: readPreFlightSeven(lessonId),
    briefed: isMissionBriefingComplete(readMissionBriefing(lessonId)),
    clearances: readClearances(lessonId),
    telemetryFor: (droneId) =>
      snapshot.state?.drones.find((drone) => drone.id === droneId)?.telemetry ?? null,
    anyAirborne: vitals.some((entry) => entry.airborne),
  })

  // A step the Teacher asked for wins. Otherwise the records choose, clamped to set-up,
  // because the later steps are not on this screen.
  const step = isSetUpStep(requestedStep)
    ? requestedStep
    : Math.min(5, Math.max(1, currentMissionStep(facts)))

  if (!snapshot.state) {
    return (
      <main id="content" tabIndex={-1} className="p-8">
        <p className="m-0 text-body text-ink-muted">Waiting for the first Fleet State.</p>
      </main>
    )
  }

  return (
    <main
      id="content"
      tabIndex={-1}
      className={cn(READING_FRAME, 'flex flex-col gap-6 p-4 min-[26rem]:p-8')}
    >

      <div className="flex items-start gap-5">
        <StepRail
          facts={facts}
          activeStep={step}
          lessonName={lesson?.label ?? null}
          open={railOpen}
          onToggle={() => setRailOpen((was) => !was)}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <MissionPrep
            step={step}
            drones={drones}
            book={book}
            snapshot={snapshot}
            lessonId={lessonId}
            mission={mission}
            onMissionChange={setMission}
          />

          {/*
           * Everything the Lesson is besides the Mission: whether the Fleet is
           * serviceable, who is flying what, starting and ending the period, pack-down,
           * and what happened last week.
           *
           * It used to fold into a disclosure summarised "Start a Lesson, and the rest of
           * the day", carried on every step. A Teacher on step 4 read it as a drawer of
           * unexplained work under the one thing they were being asked to do. It is the
           * top of the day, so it sits at the top of the day: step 1, in the open, and
           * nowhere else.
           */}
          {step === 1 ? (
            <div className="flex flex-col gap-6 border-t border-hairline pt-6">
              {lesson ? (
                <LessonUnderWay lesson={lesson} now={now} book={book} />
              ) : (
                <PreFlight drones={drones} vitals={vitals} book={book} now={now} />
              )}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  )
}

/**
 * The check before the lesson.
 *
 * Deliberately not just the board again. The board says what every Drone is; this says
 * whether the lesson can go ahead, and lists the things standing in the way in the order
 * a Teacher can act on them.
 */
function PreFlight({
  drones,
  vitals,
  book,
  now,
}: {
  drones: readonly DroneState[]
  vitals: readonly DroneVitals[]
  book: ReturnType<typeof readLogbook>
  now: number
}) {
  const [label, setLabel] = useState('')
  const [exercises, setExercises] = useState<readonly Exercise[]>([])
  const [absentNotice, setAbsentNotice] = useState<AbsentReassignResult | null>(null)
  const [undoTick, setUndoTick] = useState(0)
  void undoTick

  const withheld = drones.filter((drone) => serviceStateOf(book, drone.id) === 'out-of-service')
  const withheldIds = new Set(withheld.map((drone) => drone.id))
  // A Drone the Teacher has taken out of service is not available however healthy it is.
  const usable = drones.filter((drone) => isUsable(drone.status) && !withheldIds.has(drone.id))
  const blocking = drones.filter(
    (drone) => needsAttention(drone.status) && !withheldIds.has(drone.id),
  )
  const readyLabels = vitals.map(readyBoardLabel)
  const { ready } = readyBoardSummary(readyLabels)

  return (
    <section className="flex flex-col gap-5">
      {/*
       * Fleet health in one line, and then out of the way.
       *
       * This block used to be the serviceable headline, a ready / not-ready count, and a
       * list of every craft standing in the way. All three answered "what is wrong with
       * the Fleet", which is the question the Fleet board exists for and answers better:
       * it lists every Drone with its Status and its fault. Two screens holding the same
       * list means one of them is stale, and a Teacher at 08:55 reading past it to reach
       * the step they came for.
       *
       * What survives is the one thing they need before the period: can this run. The
       * numbers are said in words as well as digits, and the line is the way to the list.
       */}
      <Link
        href="/"
        prefetch={false}
        className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-value text-ink no-underline hover:underline"
      >
        <span>
          <span className="tnum">{usable.length}</span> of{' '}
          <span className="tnum">{drones.length}</span> serviceable
        </span>
        {blocking.length > 0 ? (
          <span className="text-status-not-ready">
            <span className="tnum">{blocking.length}</span>
            {blocking.length === 1 ? ' needs attention' : ' need attention'}
          </span>
        ) : (
          <span className="text-ink-subtle">nothing needs attention</span>
        )}
      </Link>

      {withheld.length > 0 && (
        <p className="m-0 text-value text-ink-subtle">
          {withheld.length} {withheld.length === 1 ? 'Drone is' : 'Drones are'} out of service
          by your own decision and are not counted:{' '}
          {withheld.map((drone) => drone.name).join(', ')}.
        </p>
      )}

      <LessonPrepPanel drones={drones} book={book} />

      <div className="flex flex-col gap-2 border-t border-hairline pt-5">
        {ready === 0 && vitals.length > 0 && (
          <p className="m-0 text-value text-ink-muted">
            None ready to fly yet. You can still start the lesson when you need to.
          </p>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <label className="label" htmlFor="lesson-label">
              What is this lesson?
            </label>
            <input
              id="lesson-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Year 8, period 3"
              className="min-h-11 rounded-pill border border-hairline bg-surface-1 px-4 py-1.5 text-value text-ink"
            />
          </div>
          <button
            type="button"
            className="min-h-11 cursor-pointer rounded-pill border-0 bg-ink px-5 py-2 text-body font-medium text-canvas"
            onClick={() =>
              startLesson(label, ready, drones.length, now || Date.now(), exercises)
            }
          >
            Start the lesson
          </button>
        </div>
      </div>
    </section>
  )
}

/**
 * The lesson while it is happening — which is not here.
 *
 * A controller does not change position mid-sector. Everything about a running lesson now
 * lives on the Flight Control Center: what needs the Teacher, where every Drone is, what
 * each one is doing, and the way to finish. This screen says so and gets out of the way,
 * rather than offering a second, quieter version of the same thing to be watched by
 * mistake.
 */
function LessonUnderWay({
  lesson,
  now,
  book,
}: {
  lesson: LessonRecord
  now: number
  book: ReturnType<typeof readLogbook>
}) {
  const storageKey = `lesson-warmup-done:${lesson.id}`
  const [warming, setWarming] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(storageKey) !== '1'
  })

  const finishWarmUp = () => {
    sessionStorage.setItem(storageKey, '1')
    setWarming(false)
  }

  return (
    <section className="flex flex-col gap-4 rounded-surface border border-hairline bg-surface-1 p-5">
      {warming ? <LessonWarmUp onDone={finishWarmUp} /> : null}
      <div className="flex flex-col gap-1">
        <span className="label">Lesson under way</span>
        <h2 className="m-0 font-display text-heading font-medium">{lesson.label}
          <BeforeAfterScores scores={{ before: null, after: null }} /></h2>
        <p className="tnum m-0 text-value text-ink-subtle">
          {formatElapsed(Math.max(0, now - lesson.startedAt))} so far
        </p>
      </div>

      <p className="m-0 text-body text-ink-muted">
        Monitor from the Flight Control Center. Every item requiring action is listed there, in
        the order it requires action, and the lesson is ended from there.
      </p>

      <WaitingList book={book} />

      <LessonBookmarkControl
        lessonId={lesson.id}
        startedAt={lesson.startedAt}
        now={now}
        bookmarks={lesson.bookmarks ?? []}
      />

      <LessonIncidentNoteControl
        lessonId={lesson.id}
        startedAt={lesson.startedAt}
        now={now}
        incidents={lesson.incidents}
      />

      <Link
        href="/control"
        className="min-h-11 w-fit cursor-pointer rounded-pill border-0 bg-ink px-5 py-2 text-body font-medium text-canvas no-underline"
      >
        Go to the Flight Control Center
      </Link>
    </section>
  )
}


function NextStepHint({ children }: { readonly children: string }) {
  return (
    <p className="m-0 text-value text-ink-muted">
      <span className="label">Next — </span>
      {children}
    </p>
  )
}

/**
 * Mission set-up, one step at a time.
 *
 * This was a single column with five blocks that appeared as their turn came, and a
 * Teacher part-way down it had no way to tell how much was left or to go back and change
 * an answer. The five blocks have not changed. What changed is that one is on screen at a
 * time, the rail beside it says which, and the Scenario and the zones outlive the screen.
 *
 * The step comes from `?step=` rather than component state so the rail, the browser's back
 * button and a bookmarked half-finished set-up all agree.
 */
function MissionPrep({
  step,
  drones,
  book,
  snapshot,
  lessonId,
  mission,
  onMissionChange,
}: {
  readonly step: number
  readonly drones: readonly DroneState[]
  readonly book: ReturnType<typeof readLogbook>
  readonly snapshot: FleetSnapshot
  readonly lessonId: string | null
  readonly mission: Mission | null
  readonly onMissionChange: (mission: Mission | null) => void
}) {
  const teams = readTeams()
  const scenarioId = mission?.scenarioId ?? null
  const zones = mission?.zones ?? []
  const definition = MISSION_FLOW_STEPS[step - 1]
  const phaseLabel =
    MISSION_FLOW_PHASES.find((phase) => phase.id === definition?.phase)?.label ?? ''

  const craftIds = missionCraftIds(teams, mission)
  const telemetryFor = (droneId: string) =>
    snapshot.state?.drones.find((drone) => drone.id === droneId)?.telemetry ?? null

  return (
    <div className="flex flex-col gap-5">
      {/*
       * The step names itself as an instruction, which is deliberately not the noun the
       * rail uses. "Mission Scenario" is a place in the day; "Choose the Mission Scenario"
       * is the work. Saying the same words twice would be the duplicate-navigation problem
       * that got the first rail withdrawn.
       */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="label rounded-pill bg-muted px-2.5 py-1 text-ink-subtle">
            {phaseLabel}
          </span>
          <span className="label tnum">{`Step ${step} of ${MISSION_STEP_COUNT}`}</span>
        </div>
        <h1 className="m-0 font-display text-heading font-medium text-balance">
          {definition?.title}
        </h1>
        <p className="m-0 max-w-[62ch] text-value text-ink-subtle">{definition?.why}</p>
      </div>

      {step === 1 ? (
        <ScenarioPicker
          selectedScenarioId={scenarioId}
          onSelect={(id) => onMissionChange(chooseScenario(lessonId, id))}
          locked={false}
          bare
        />
      ) : null}

      {step === 2 ? (
        <MissionAreaEditor
          zones={zones}
          onChange={(next) => onMissionChange(setMissionZones(lessonId, next))}
          bare
        />
      ) : null}

      {step === 3 ? (
        <>
          <TeamsPanel book={book} drones={drones} bare />
          <SetMissionCraftButton
            lessonId={lessonId}
            craftIds={craftIds}
            mission={mission}
            onMissionChange={onMissionChange}
          />
        </>
      ) : null}

      {step === 4 ? (
        craftIds.length === 0 ? (
          <p className="m-0 text-value text-ink-muted">
            No craft on a team yet. Go back to Teams and Drones.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {craftIds.map((droneId) => (
              <PreFlightSeven
                key={droneId}
                droneId={droneId}
                lessonId={lessonId}
                telemetry={telemetryFor(droneId)}
              />
            ))}
          </div>
        )
      ) : null}

      {step === 5 ? (
        <>
          <MissionBriefing lessonId={lessonId} scenarioId={scenarioId} bare />
          {/* The classroom rules, which are a different list from the Mission rules and
              used to sit on this screen twice over. */}
          <SafetyBriefPanel lessonId={lessonId} />
          {mission !== null && teams.length > 0 ? (
            <div className="flex flex-col gap-4">
              <h2 className="label m-0">Team briefs to print</h2>
              <div className="grid grid-cols-1 gap-4 min-[48rem]:grid-cols-2">
                {teams.map((team) => (
                  <TeamBriefPrint key={team.id} team={team} mission={mission} />
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <MissionPrepFoot step={step} />
    </div>
  )
}

/**
 * Which craft this Mission is flown by, written onto the Mission itself.
 *
 * Teams already say it, and the rail reads teams directly. The Mission needs its own copy
 * because the clearance queue and the completion check are both about *this Mission's*
 * craft, and a team taking a different Drone tomorrow must not rewrite what happened today.
 */
function SetMissionCraftButton({
  lessonId,
  craftIds,
  mission,
  onMissionChange,
}: {
  readonly lessonId: string | null
  readonly craftIds: readonly string[]
  readonly mission: Mission | null
  readonly onMissionChange: (mission: Mission | null) => void
}) {
  if (mission === null || craftIds.length === 0) return null

  const same =
    mission.droneIds.length === craftIds.length &&
    craftIds.every((droneId) => mission.droneIds.includes(droneId))

  if (same) {
    return (
      <p className="m-0 text-value text-ink-subtle">
        <span className="tnum">{craftIds.length}</span>
        {craftIds.length === 1 ? ' craft is' : ' craft are'} on this Mission.
      </p>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onMissionChange(setMissionDrones(lessonId, craftIds))}
      className="min-h-11 w-fit cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
    >
      Put these {craftIds.length} craft on the Mission
    </button>
  )
}

/**
 * Back and on, in the flow rather than only in the rail.
 *
 * The forward control says **Next** and nothing else. It used to be labelled with the next
 * step's whole `nextAction` sentence, which put a paragraph inside a button and gave the
 * one control a Teacher presses twelve times a day a different width and a different
 * wrapping on every step. Where it goes is said beside it, as text, where a changing
 * length costs nothing.
 */
function MissionPrepFoot({ step }: { readonly step: number }) {
  const next = MISSION_FLOW_STEPS[step]

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-4">
      {step > 1 ? (
        <Link
          href={`/lesson?step=${step - 1}`}
          prefetch={false}
          className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink no-underline hover:border-ink"
        >
          Back
        </Link>
      ) : null}
      {next ? (
        <>
          <Link
            href={next.href}
            prefetch={false}
            className="min-h-11 cursor-pointer rounded-pill border-0 bg-ink px-5 py-2 text-body font-medium text-canvas no-underline"
          >
            Next
          </Link>
          <span className="text-value text-ink-subtle">{next.label}</span>
        </>
      ) : null}
    </div>
  )
}
