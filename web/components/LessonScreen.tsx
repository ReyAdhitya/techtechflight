'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { DroneState } from '@techtechflight/contract'
import {
  readLogbook,
  readServerLogbook,
  runningLesson,
  startLesson,
  subscribeLogbook,
  type LessonRecord,
} from '@/lib/logbook'
import { openClassroom, readClassroomSession } from '@/lib/classroom-session'
import { MISSION_SCENARIOS, scenarioById } from '@/lib/mission-scenarios'
import { cn } from '@/lib/utils'
import { ClassroomCodePanel } from './ClassroomCodePanel'
import { BatteryOnChargeTick } from './BatteryOnChargeTick'
import { CraftReturnedTick } from './CraftReturnedTick'
import { PackdownChecklist } from './PackdownChecklist'
import { SafetyBriefPanel } from './SafetyBriefPanel'
import { WaitingList } from './WaitingList'
import { useFleet } from './FleetProvider'
import { formatElapsed } from './LessonStrip'
import { BeforeAfterScores } from './BeforeAfterScores'
import { LessonWarmUp } from './LessonWarmUp'
import { READING_FRAME } from '@/lib/frame'
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
  startMission,
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
 * The lesson, from the check before it to the summary after it.
 *
 * This is the workflow the board was always implying and never quite supported. A
 * Teacher does not glance at a status board out of curiosity — they glance at it at
 * 08:55 to find out whether the next hour is going to work, and again afterwards to find
 * out what broke. Everything here is built around those two moments.
 */
export function LessonScreen() {
  const { snapshot, now, vitals } = useFleet()
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)
  const lesson = runningLesson(book)
  const lessonId = lesson?.id ?? null
  const drones = snapshot.state?.drones ?? []
  const anyAirborne = vitals.some((entry) => entry.airborne)

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
    anyAirborne,
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

      <div className="flex items-start gap-3 min-[60rem]:gap-5">
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
           * Start the lesson is the one piece of Lesson admin the step flow still needs.
           * The serviceable counts, plan wizard, assignment columns and past Lessons used
           * to sit under step 1 and drowned the Scenario picker (#622). Pack-down stays
           * when a Lesson is already running.
           */}
          <ClassroomCodePanel
            onOpen={() => {
              const draft = readMission(lessonId)
              const scenario =
                (draft ? scenarioById(draft.scenarioId) : null) ?? MISSION_SCENARIOS[0]!
              const existingCode = readClassroomSession()?.code
              return openClassroom({
                ...(existingCode ? { code: existingCode } : {}),
                lessonId,
                lessonLabel: lesson?.label ?? '',
                scenarioId: scenario.id,
                scenarioName: scenario.name,
                objective: scenario.objective,
                rules: scenario.teamFocus,
                limitMinutes: scenario.defaultLimitMinutes,
                zones: draft?.zones ?? [],
                live: lesson !== null,
              })
            }}
          />

          {lesson ? (
            <LessonUnderWay lesson={lesson} now={now} drones={drones} book={book} />
          ) : (
            <StartLessonStrip
              fleetSize={drones.length}
              now={now}
              mission={mission}
              onMissionChange={setMission}
            />
          )}
        </div>
      </div>
    </main>
  )
}

/**
 * One Start that binds Lesson + Mission + classroom code (#630).
 *
 * E7 still holds: no name required. Missing Scenario defaults to Search and Rescue so
 * Students and clearances have something to join.
 */
function StartLessonStrip({
  fleetSize,
  now,
  mission,
  onMissionChange,
}: {
  readonly fleetSize: number
  readonly now: number
  readonly mission: Mission | null
  readonly onMissionChange: (mission: Mission | null) => void
}) {
  const [label, setLabel] = useState('')

  const begin = () => {
    const startedAt = now || Date.now()
    const lessonId = startLesson(label, fleetSize, fleetSize, startedAt)
    if (!lessonId) return

    let nextMission = adoptMissionDraft(lessonId).mission ?? mission
    if (nextMission === null) {
      nextMission = chooseScenario(lessonId, 'search-rescue')
    } else {
      onMissionChange(nextMission)
    }
    startMission(lessonId, startedAt)
    onMissionChange(readMission(lessonId))

    const scenario = scenarioById(nextMission.scenarioId) ?? MISSION_SCENARIOS[0]!
    const existingCode = readClassroomSession()?.code
    const classroomInput = {
      lessonId,
      lessonLabel: label.trim() || 'Untitled lesson',
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      objective: scenario.objective,
      rules: scenario.teamFocus,
      limitMinutes: scenario.defaultLimitMinutes,
      zones: nextMission.zones,
      live: true as const,
      now: startedAt,
    }
    openClassroom(
      existingCode ? { ...classroomInput, code: existingCode } : classroomInput,
    )

    // Production goes straight to the flying board. Vitest/jsdom cannot navigate.
    if (typeof process === 'undefined' || process.env.VITEST !== 'true') {
      window.location.assign('/control')
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-hairline pt-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
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
          onClick={begin}
        >
          Start the lesson
        </button>
      </div>
      <p className="m-0 text-value text-ink-muted">
        Starts the Lesson, opens the Student classroom code, and goes to Control.
      </p>
    </div>
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
  drones,
  book,
}: {
  lesson: LessonRecord
  now: number
  drones: readonly DroneState[]
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

  const packdownCrafts = drones.map((drone) => ({
    droneId: drone.id,
    droneName: drone.name,
  }))

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

      <SafetyBriefPanel lessonId={lesson.id} />

      <MissionBriefing lessonId={lesson.id} scenarioId={null} />

      <WaitingList book={book} />

      <div className="flex flex-col gap-4 border-t border-hairline pt-4">
        <h2 className="label m-0">Pack-down</h2>
        <PackdownChecklist lessonId={lesson.id} crafts={packdownCrafts} />
        <BatteryOnChargeTick lessonId={lesson.id} packs={packdownCrafts} />
        <CraftReturnedTick lessonId={lesson.id} crafts={packdownCrafts} />
      </div>

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
 * The forward control says **Next** and nothing else (#615). It used to carry the next
 * step's name beside it, which was one more thing to read on a control that only does
 * one thing.
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
        <Link
          href={next.href}
          prefetch={false}
          className="min-h-11 cursor-pointer rounded-pill border-0 bg-ink px-5 py-2 text-body font-medium text-canvas no-underline"
        >
          Next
        </Link>
      ) : null}
    </div>
  )
}

