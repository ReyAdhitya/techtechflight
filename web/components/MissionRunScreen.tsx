'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { alertQueue } from '@/lib/vitals'
import { readClearances } from '@/lib/clearance-store'
import { awaitingClearance, type ClearanceCraftInput } from '@/lib/clearance'
import { readClassroomSession, studentOnDrone } from '@/lib/classroom-session'
import { INSTRUMENT_FRAME } from '@/lib/frame'
import {
  readLogbook,
  readServerLogbook,
  runningLesson,
  studentIdOf,
  subscribeLogbook,
} from '@/lib/logbook'
import { readMission } from '@/lib/mission-draft'
import {
  MISSION_FLOW_PHASES,
  MISSION_FLOW_STEPS,
  MISSION_STEP_COUNT,
  currentMissionStep,
  isMissionStepOpen,
  missionStepBlockedBy,
  missionStepHref,
  noMissionYet,
  type MissionFlowFacts,
} from '@/lib/mission-flow'
import { missionCraftIds, missionFlowFactsFrom } from '@/lib/mission-flow-facts'
import { noMissionSummaryYet, type MissionFlowSummary } from '@/lib/mission-flow-summary'
import { scenarioById } from '@/lib/mission-scenarios'
import {
  evaluatePreFlightSeven,
  isPreFlightSevenDone,
  propellersTicked,
  readPreFlightSeven,
} from '@/lib/preflight-seven'
import { readTeams } from '@/lib/teams'
import { cn } from '@/lib/utils'
import { ControlScreen } from './ControlScreen'
import { useFleet } from './FleetProvider'
import { LessonScreen } from './LessonScreen'
import {
  MISSION_BRIEFING_SECTIONS,
  readMissionBriefing,
  type MissionBriefingState,
} from './MissionBriefing'
import { ReportsScreen } from './ReportsScreen'
import { StepRail } from './StepRail'

/**
 * The Mission run: one page, twelve steps, and the rail as the only navigation on it.
 *
 * ADR-0026. `/lesson`, `/control` and `/reports` were three destinations for one hour of
 * teaching, and a Teacher mid-lesson had to know which of them answered the question they
 * had. The work has not moved: steps 1 to 5 are still the Lesson screen, 6 to 11 are still
 * the live Control board and 12 is still the report. What changed is that they are reached
 * by a rail that knows where the Teacher is instead of by a bar that does not.
 *
 * The step is in the query, and it survives a reload. With no `?step=` the records choose,
 * which is what a Teacher opening the board mid-period wants.
 */
export function MissionRunScreen() {
  const search = useSearchParams()
  const { snapshot, vitals, isAcknowledged, now } = useFleet()
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)
  const lesson = runningLesson(book)
  const lessonId = lesson?.id ?? null

  /*
   * Open on a board, shut on anything narrow. Under 60rem the rail leaves the flow and
   * slides over the surface, so an open one on arrival is a drawer covering the work with
   * nothing on screen saying why. The server render has no viewport, so it says open and
   * the effect corrects it, which is the one order that hydrates cleanly.
   */
  const [railOpen, setRailOpen] = useState(true)
  const [narrow, setNarrow] = useState(false)

  useEffect(() => {
    // jsdom has no `matchMedia`, and neither does an old browser. A board is the honest
    // default when nothing can be asked: the rail is in the flow and hides nothing.
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(max-width: 60rem)')
    const apply = () => {
      setNarrow(query.matches)
      if (query.matches) setRailOpen(false)
    }
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])

  /*
   * The rail reads eight localStorage keys, and this is a static export, so every visit is
   * a hydration. Reading a device in a render body is how React #418 gets into production:
   * the export has no Mission on it, the browser does, and the whole tree is rebuilt
   * silently on every page load. So the first client render matches the export, and the
   * records arrive on the tick after it.
   */
  const [onDevice, setOnDevice] = useState(false)
  useEffect(() => setOnDevice(true), [])

  /*
   * Which Drone the Teacher is reading. The selection lives on the live board, because the
   * Scope and the strips are there; it is lifted here because the rail's step 8 is the only
   * other thing that wants it. It was hardcoded null, so that step could only ever read
   * "No Drone selected", a sentence the rail could not leave and the board could.
   */
  const [selectedCraftName, setSelectedCraftName] = useState<string | null>(null)

  const drones = snapshot.state?.drones ?? []
  const anyAirborne = vitals.some((entry) => entry.airborne)

  const { facts, summary } = useMemo(() => {
    if (!onDevice) {
      return { facts: noMissionYet(), summary: noMissionSummaryYet() }
    }
    return readMissionRun({
      lessonId,
      book,
      drones,
      vitals,
      isAcknowledged,
      anyAirborne,
      selectedCraftName,
      now,
    })
  }, [
    onDevice,
    lessonId,
    book,
    drones,
    vitals,
    isAcknowledged,
    anyAirborne,
    selectedCraftName,
    now,
  ])

  /*
   * A step in the query wins, because the rail put it there, and it wins even when the step
   * is not open yet. Bouncing a Teacher who pressed step 10 back to step 1 is the dead end
   * the first rail had: it reads as a broken link. The step opens, says what is standing in
   * the way, and offers nothing it cannot do.
   */
  const asked = Number(search.get('step'))
  const step =
    Number.isInteger(asked) && asked >= 1 && asked <= MISSION_STEP_COUNT
      ? asked
      : currentMissionStep(facts)

  const here = MISSION_FLOW_STEPS[step - 1] ?? MISSION_FLOW_STEPS[0]!
  const phase = MISSION_FLOW_PHASES.find((entry) => entry.id === here.phase)
  const open = isMissionStepOpen(step, facts)
  const blockedBy = missionStepBlockedBy(step, facts)

  // Pressing a step in a drawer is asking to be taken there, not to keep the drawer.
  useEffect(() => {
    if (narrow) setRailOpen(false)
  }, [narrow, step])

  /*
   * Moving between steps from inside a step.
   *
   * The rail is the navigation on this page and stays so; this is the same destination named
   * where the Teacher is looking, for the three Teacher actions that are questions rather
   * than commands. `replace` rather than `push`: walking a rail is not browsing, and a
   * Teacher pressing Back after four steps wants the screen they came from, not the fourth
   * one back.
   */
  const router = useRouter()
  const goToStep = useCallback(
    (wanted: number) => router.replace(`/mission?step=${wanted}`),
    [router],
  )

  /*
   * Where the keyboard is after a step change, and this is a fix rather than a nicety.
   *
   * The live board scrolls its own section into view when the step changes, and
   * `scrollIntoView` moves the sequential focus navigation starting point to whatever it
   * scrolled to. That point is deep inside the board, so Tab carried on from the middle of
   * the strips and the rail was not reachable in forty presses.
   *
   * Focusing the surface puts the starting point at the top of it instead: the rail is one
   * Shift+Tab away, and every control on the step is ahead. It is also the right thing on
   * its own terms, because pressing a step is a navigation and focus should follow it. Only
   * after a change, never on arrival, so opening the page does not steal the focus.
   */
  const surfaceRef = useRef<HTMLElement>(null)
  const shownStep = useRef(step)
  useEffect(() => {
    if (shownStep.current === step) return
    shownStep.current = step
    surfaceRef.current?.focus({ preventScroll: true })
  }, [step])

  return (
    <div className="mission-run flex items-start gap-0 p-4 min-[26rem]:p-5">
      {/*
       * The way back out of the drawer. Only ever on screen while the rail is over the
       * board, and it is a button rather than a bare div so a keyboard can reach it too.
       */}
      {narrow && railOpen && (
        <button
          type="button"
          className="mission-run__scrim"
          onClick={() => setRailOpen(false)}
        >
          <span className="sr-only">Close the Mission steps</span>
        </button>
      )}

      <StepRail
        facts={facts}
        summary={summary}
        activeStep={step}
        lessonName={lesson?.label ?? null}
        open={railOpen}
        onToggle={() => setRailOpen((wasOpen) => !wasOpen)}
      />

      <main
        id="content"
        ref={surfaceRef}
        tabIndex={-1}
        className={cn(INSTRUMENT_FRAME, 'mission-run__surface flex flex-col gap-6')}
      >
        {/* On a board the rail is always there, so this is the narrow screen's only way in. */}
        <button
          type="button"
          className="mission-run__steps"
          aria-expanded={railOpen}
          onClick={() => setRailOpen(true)}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <path d="M2 4h12M2 8h12M2 12h12" />
          </svg>
          Steps
        </button>

        <header className="flex flex-col gap-1.5">
          <p className="m-0 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="rounded-pill bg-muted px-2.5 py-0.5 text-label font-semibold uppercase tracking-[0.07em] text-ink-subtle">
              {phase?.label ?? 'Set up'}
            </span>
            <span className="tnum label">{`Step ${step} of ${MISSION_STEP_COUNT}`}</span>
          </p>
          <h1 className="m-0 font-display text-heading font-medium text-balance">
            {here.title}
          </h1>
          <p className="m-0 max-w-[62ch] text-value text-ink-muted">{here.why}</p>
        </header>

        {open ? (
          <StepSurface
            step={step}
            onSelectedCraftChange={setSelectedCraftName}
            onGoToStep={goToStep}
          />
        ) : (
          <p
            className="m-0 rounded-surface border border-dashed border-hairline bg-surface-1 px-3.5 py-3 text-value text-ink-muted"
            role="status"
          >
            <b className="font-semibold text-ink-subtle">Not open yet.</b> {blockedBy}.
          </p>
        )}

        {open && here.next !== null && (
          <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-5">
            <Link
              href={missionStepHref(step + 1)}
              prefetch={false}
              className="min-h-11 w-fit cursor-pointer rounded-pill border-0 bg-ink px-5 py-2 text-body font-medium text-canvas no-underline"
            >
              {here.next}
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}

/**
 * What the step is worked on.
 *
 * Set-up is one block at a time, because those five genuinely happen in order. Steps 6 to
 * 11 are the live board, whole, with the section for the step brought into view: the
 * prototype says so against step 7, and hiding four of the five would put Land and Stop
 * behind a navigation press.
 */
function StepSurface({
  step,
  onSelectedCraftChange,
  onGoToStep,
}: {
  readonly step: number
  readonly onSelectedCraftChange: (name: string | null) => void
  readonly onGoToStep: (step: number) => void
}) {
  if (step <= 5) return <LessonScreen bare step={step} />
  if (step <= 11) {
    return (
      <ControlScreen
        bare
        step={step}
        onSelectedCraftChange={onSelectedCraftChange}
        onGoToStep={onGoToStep}
      />
    )
  }
  return <ReportsScreen bare />
}

/** Everything the rail reads, gathered once so no two steps can disagree about it. */
function readMissionRun({
  lessonId,
  book,
  drones,
  vitals,
  isAcknowledged,
  anyAirborne,
  selectedCraftName,
  now,
}: {
  readonly lessonId: string | null
  readonly book: ReturnType<typeof readLogbook>
  readonly drones: readonly {
    readonly id: string
    readonly name: string
    readonly status: import('@techtechflight/contract').Status
    readonly telemetry?: import('@techtechflight/contract').Telemetry | null
  }[]
  readonly vitals: ReturnType<typeof useFleet>['vitals']
  readonly isAcknowledged: ReturnType<typeof useFleet>['isAcknowledged']
  readonly anyAirborne: boolean
  readonly selectedCraftName: string | null
  readonly now: number
}): { facts: MissionFlowFacts; summary: MissionFlowSummary } {
  const mission = readMission(lessonId)
  const teams = readTeams()
  const preFlight = readPreFlightSeven(lessonId)
  const clearances = readClearances(lessonId)
  const briefing = readMissionBriefing(lessonId)
  const briefed = briefSectionsTicked(briefing) === MISSION_BRIEFING_SECTIONS.length
  const telemetryFor = (droneId: string) =>
    drones.find((drone) => drone.id === droneId)?.telemetry ?? null

  const facts = missionFlowFactsFrom({
    mission,
    teams,
    preFlight,
    briefed,
    clearances,
    telemetryFor,
    anyAirborne,
  })

  const craftIds = missionCraftIds(teams, mission)
  /*
   * Same rule as the queue itself: the seat a child took on their own tablet first, and the
   * Logbook assignment as the fallback. The rail's count and the queue below it are two
   * readings of one thing, and two rules for who counts as a Student would make them
   * disagree in front of a class.
   */
  const classroom = readClassroomSession()
  const queueInputs: readonly ClearanceCraftInput[] = drones
    .filter((drone) => craftIds.includes(drone.id))
    .map((drone) => ({
      droneId: drone.id,
      status: drone.status,
      studentId: studentOnDrone(classroom, drone.id, studentIdOf(book, drone.id)),
      preFlightDone: propellersTicked(preFlight, drone.id),
      mission,
    }))

  const summary: MissionFlowSummary = {
    scenarioName: mission === null ? null : (scenarioById(mission.scenarioId)?.name ?? null),
    noFlyZones: (mission?.zones ?? []).length,
    teams: teams.length,
    craft: craftIds.length,
    craftPastPreFlight: craftIds.filter((droneId) =>
      isPreFlightSevenDone(
        evaluatePreFlightSeven(telemetryFor(droneId), propellersTicked(preFlight, droneId)),
      ),
    ).length,
    briefSectionsTicked: briefSectionsTicked(briefing),
    briefSections: MISSION_BRIEFING_SECTIONS.length,
    awaitingClearance: awaitingClearance(queueInputs, clearances).length,
    airborne: vitals.filter((entry) => entry.airborne).length,
    selectedCraftName,
    commandsSent: (book.lessons.find((row) => row.id === lessonId)?.commands ?? []).length,
    criticalAlerts: alertQueue(vitals, isAcknowledged).filter(
      (alert) => alert.severity === 'critical',
    ).length,
    sealedAt: mission?.outcome?.endedAt ?? null,
  }

  // `now` is what makes this recompute each Fleet tick; nothing else reads it.
  void now

  return { facts, summary }
}

/** A briefing section counts once every rule under it has been said out loud. */
function briefSectionsTicked(state: MissionBriefingState): number {
  return MISSION_BRIEFING_SECTIONS.filter((section) =>
    section.rules.every((rule) => state.checked[rule.id] === true),
  ).length
}
