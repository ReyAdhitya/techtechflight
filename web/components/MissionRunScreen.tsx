'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { alertQueue } from '@/lib/vitals'
import { readClearances } from '@/lib/clearance-store'
import { awaitingClearance, type ClearanceCraftInput } from '@/lib/clearance'
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

  const [railOpen, setRailOpen] = useState(true)

  /*
   * The rail reads eight localStorage keys, and this is a static export, so every visit is
   * a hydration. Reading a device in a render body is how React #418 gets into production:
   * the export has no Mission on it, the browser does, and the whole tree is rebuilt
   * silently on every page load. So the first client render matches the export, and the
   * records arrive on the tick after it.
   */
  const [onDevice, setOnDevice] = useState(false)
  useEffect(() => setOnDevice(true), [])

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
      selectedCraftName: null,
      now,
    })
  }, [onDevice, lessonId, book, drones, vitals, isAcknowledged, anyAirborne, now])

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

  return (
    <div className="mission-run flex items-start gap-0 p-4 min-[26rem]:p-5">
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
        tabIndex={-1}
        className={cn(INSTRUMENT_FRAME, 'mission-run__surface flex flex-col gap-6')}
      >
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
          <StepSurface step={step} />
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
function StepSurface({ step }: { readonly step: number }) {
  if (step <= 5) return <LessonScreen bare step={step} />
  if (step <= 11) return <ControlScreen bare step={step} />
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
  const queueInputs: readonly ClearanceCraftInput[] = drones
    .filter((drone) => craftIds.includes(drone.id))
    .map((drone) => ({
      droneId: drone.id,
      status: drone.status,
      studentId: studentIdOf(book, drone.id),
      preFlightDone: propellersTicked(preFlight, drone.id),
      mission,
    }))

  const summary: MissionFlowSummary = {
    scenarioName: mission === null ? null : (scenarioById(mission.scenarioId)?.name ?? null),
    missionZones: (mission?.zones ?? []).filter((zone) => zone.kind === 'mission').length,
    noFlyZones: (mission?.zones ?? []).filter((zone) => zone.kind === 'no-fly').length,
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
