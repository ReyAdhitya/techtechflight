'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { isUsable, needsAttention, type DroneState } from '@techtechflight/contract'
import {
  readLogbook,
  readServerLogbook,
  runningLesson,
  serviceStateOf,
  startLesson,
  subscribeLogbook,
  type Exercise,
  type LessonRecord,
} from '@/lib/logbook'
import { cn } from '@/lib/utils'
import { ControlDisclosure } from './ControlDisclosure'
import { LessonPrepPanel } from './LessonPrepPanel'
import { SafetyBriefPanel } from './SafetyBriefPanel'
import { WaitingList } from './WaitingList'
import { useFleet } from './FleetProvider'
import { formatElapsed } from './LessonStrip'
import { BeforeAfterScores } from './BeforeAfterScores'
import { LessonWarmUp } from './LessonWarmUp'
import { skipWarmUp, warmUpSkipped } from '@/lib/warm-up-skip'
import { readyBoardLabel, readyBoardSummary } from './walls/ready-mapping'
import { READING_FRAME } from '@/lib/frame'
import type { DroneVitals } from '@/lib/vitals'
import { LessonBookmarkControl } from './LessonBookmarkControl'
import { LessonIncidentNoteControl } from './LessonIncidentNoteControl'
import { ScenarioPicker } from './ScenarioPicker'
import { MissionAreaEditor } from './MissionAreaEditor'
import { scopeWindow } from './Scope'
import type { ZoneWindow } from '@/lib/zone-visibility'
import { TeamsPanel } from './TeamsPanel'
import { PreFlightSeven } from './PreFlightSeven'
import { TickEveryPropeller } from './TickEveryPropeller'
import { MissionBriefing } from './MissionBriefing'
import { TeamBriefPrint } from './TeamBriefPrint'
import { ClassroomCodePanel } from './ClassroomCodePanel'
import { ClassroomSeatsPanel } from './ClassroomSeatsPanel'
import type { Mission } from '@/lib/mission'
import { readServerTeams, readTeams, subscribeTeams } from '@/lib/teams'
import {
  adoptMissionDraft,
  chooseScenario,
  readMission,
  setMissionDrones,
  setMissionZones,
} from '@/lib/mission-draft'
import { missionCraftIds } from '@/lib/mission-flow-facts'
import type { FleetSnapshot } from '@/lib/fleet-link'

/**
 * Set this Mission up, and start or end the period. Steps 1 to 5 of the Mission run.
 *
 * Scenario, zones, teams, pre-flight, brief, and the period itself. On `/mission` this is
 * mounted one step at a time by `MissionRunScreen`, which supplies the heading and the
 * reason for the step from the rail's own model; on its own it shows all five at once and
 * carries its own heading. Fleet health Drone by Drone, finished Lessons, pack-down and
 * where records live stay on Fleet, Reports, step 11 and Settings.
 */
export function LessonScreen({
  bare = false,
  step,
}: {
  /** Mounted inside another screen's `main`, so it renders neither one nor a heading. */
  readonly bare?: boolean
  /** Which of the five set-up steps to show. All of them when it is not said. */
  readonly step?: number
} = {}) {
  const { snapshot, now, vitals } = useFleet()
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)
  const lesson = runningLesson(book)
  const lessonId = lesson?.id ?? null
  const drones = snapshot.state?.drones ?? []

  const [mission, setMission] = useState<Mission | null>(null)

  useEffect(() => {
    setMission(lessonId === null ? readMission(null) : adoptMissionDraft(lessonId).mission)
  }, [lessonId])

  if (!snapshot.state) {
    const waiting = (
      <p className="m-0 text-body text-ink-muted">Waiting for the first Fleet State.</p>
    )
    if (bare) return waiting
    return (
      <main id="content" tabIndex={-1} className="p-8">
        {waiting}
      </main>
    )
  }

  /*
   * The period sits with step 1. Starting a Lesson is the same moment as choosing what the
   * class is going to do, and repeating it above every set-up step would be four restatements
   * of a control a Teacher presses once.
   */
  const showsPeriod = !bare || step === 1

  const body = (
    <>
      {showsPeriod &&
        (lesson ? (
          <LessonUnderWay lesson={lesson} now={now} book={book} drones={drones} />
        ) : (
          <PreFlight drones={drones} vitals={vitals} book={book} now={now} />
        ))}

      <MissionPrep
        drones={drones}
        book={book}
        snapshot={snapshot}
        lessonId={lessonId}
        mission={mission}
        onMissionChange={setMission}
        step={bare ? step : undefined}
      />
    </>
  )

  if (bare) return <div className="flex flex-col gap-8">{body}</div>

  return (
    <main
      id="content"
      tabIndex={-1}
      className={cn(READING_FRAME, 'flex flex-col gap-8 p-4 min-[26rem]:p-8')}
    >
      <header className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-heading font-medium text-balance">
          Set this Mission up
        </h1>
        <p className="m-0 max-w-[62ch] text-value text-ink-subtle">
          Choose the Scenario, draw the airspace, put teams on Drones, tick pre-flight, brief
          the class, then start the period. Live flying is step 6 onwards.
        </p>
      </header>

      {body}
    </main>
  )
}

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
  const [exercises] = useState<readonly Exercise[]>([])

  const withheld = drones.filter((drone) => serviceStateOf(book, drone.id) === 'out-of-service')
  const withheldIds = new Set(withheld.map((drone) => drone.id))
  const usable = drones.filter((drone) => isUsable(drone.status) && !withheldIds.has(drone.id))
  const blocking = drones.filter(
    (drone) => needsAttention(drone.status) && !withheldIds.has(drone.id),
  )
  const readyLabels = vitals.map(readyBoardLabel)
  const { ready } = readyBoardSummary(readyLabels)

  return (
    <section className="flex flex-col gap-5">
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

      {/*
       * Asked once. This screen used to carry *Lesson name* on the plan panel and *What is
       * this lesson?* over the Start button: one question, two boxes, and no way for a
       * Teacher to tell which of them the Lesson would end up called. Both read this.
       */}
      <div className="flex flex-col gap-2">
        {ready === 0 && vitals.length > 0 && (
          <p className="m-0 text-value text-ink-muted">
            None ready to fly yet. You can still start the lesson when you need to.
          </p>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <label className="label" htmlFor="lesson-label">
              Lesson name
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

      <LessonPrepPanel drones={drones} book={book} lessonName={label} />
    </section>
  )
}

/** How long after a Lesson starts the warm-up overlay is still the right thing to show. */
const WARM_UP_SECONDS = 60

function LessonUnderWay({
  lesson,
  now,
  book,
  drones,
}: {
  lesson: LessonRecord
  now: number
  book: ReturnType<typeof readLogbook>
  drones: readonly DroneState[]
}) {
  /*
   * The warm-up is the first minute of a Lesson, and the Lesson's own start time is what
   * says whether that minute has passed. It used to be a `sessionStorage` flag, which is a
   * fact about a browser tab rather than about a Lesson: opening a second tab, or restarting
   * the browser, replayed a sixty second full-screen overlay over a class already flying.
   *
   * The clock cannot do that. A tab opened twenty minutes in computes a remainder of nothing
   * and never renders it, and a tab opened ten seconds in picks the countdown up where the
   * first one left it rather than starting the minute again.
   */
  const remaining = WARM_UP_SECONDS - Math.floor(Math.max(0, now - lesson.startedAt) / 1000)
  /*
   * Skip is remembered for the Lesson, not for this mounting of this panel.
   *
   * It was `useState(false)`, so walking up the rail and back inside the first minute drew the
   * full-screen minute over the Teacher again, and again. A rail is made to be walked.
   */
  const [skipped, setSkipped] = useState(false)
  useEffect(() => setSkipped(warmUpSkipped(lesson.id)), [lesson.id])
  const warming = !skipped && remaining > 0

  return (
    <section className="flex flex-col gap-4 rounded-surface border border-hairline bg-surface-1 p-5">
      {warming ? (
        <LessonWarmUp
          seconds={remaining}
          onDone={() => {
            skipWarmUp(lesson.id)
            setSkipped(true)
          }}
        />
      ) : null}
      <div className="flex flex-col gap-1">
        <span className="label">Lesson under way</span>
        <h2 className="m-0 font-display text-heading font-medium">
          {lesson.label}
          <BeforeAfterScores scores={{ before: null, after: null }} />
        </h2>
        <p className="tnum m-0 text-value text-ink-subtle">
          {formatElapsed(Math.max(0, now - lesson.startedAt))} so far
        </p>
      </div>

      <ClassroomCodePanel />

      <p className="m-0 text-body text-ink-muted">
        Students join on an iPad with the classroom code. Watch the class from step 7, and
        end the period at step 11.
      </p>

      <WaitingList book={book} />

      {/*
       * Bookmark and Note incident are not here, and that is the point of step 1.
       *
       * They sat on this panel, which is the first thing a Teacher sees when a Lesson starts:
       * before anything has flown there is no moment to bookmark and no incident to note. They
       * live on `LessonStrip`, which is above every in-the-air step, so they are where the
       * moments are. Do not put them back on the way in.
       *
       * "Change the set-up" is gone with them. It was a disclosure holding the plan panel, and
       * the rail already carries steps 1 to 5, always visible and always tappable. A second
       * door into a room that has one is a door a Teacher has to decide about.
       */}
      <Link
        href="/mission?step=6"
        prefetch={false}
        className="min-h-11 w-fit cursor-pointer rounded-pill border-0 bg-ink px-5 py-2 text-body font-medium text-canvas no-underline"
      >
        Open the clearance queue
      </Link>
    </section>
  )
}

/**
 * Mission set-up: every block at once, or the one the rail asked for.
 *
 * With a `step` the section headings go, because `MissionRunScreen` has already said what
 * the step is and why it exists at the top of the surface. Two headings for one block is
 * the restatement the collapsed navigation exists to remove.
 */
function MissionPrep({
  drones,
  book,
  snapshot,
  lessonId,
  mission,
  onMissionChange,
  step,
}: {
  readonly drones: readonly DroneState[]
  readonly book: ReturnType<typeof readLogbook>
  readonly snapshot: FleetSnapshot
  readonly lessonId: string | null
  readonly mission: Mission | null
  readonly onMissionChange: (mission: Mission | null) => void
  readonly step?: number | undefined
}) {
  /*
   * Subscribed rather than read during render. Read once per render, this screen only noticed
   * a team getting a Drone when something else re-rendered it, so "Put these craft on the
   * Mission" stayed away until the page was reloaded.
   */
  const teams = useSyncExternalStore(subscribeTeams, readTeams, readServerTeams)
  const scenarioId = mission?.scenarioId ?? null
  const zones = mission?.zones ?? []
  const craftIds = missionCraftIds(teams, mission)
  const telemetryFor = (droneId: string) =>
    snapshot.state?.drones.find((drone) => drone.id === droneId)?.telemetry ?? null

  const shows = (which: number) => step === undefined || step === which
  const heading = step === undefined

  return (
    <div className="flex flex-col gap-10">
      {shows(1) && (
      <section className="flex flex-col gap-4" aria-labelledby="mission-scenario-heading">
        {heading && (
        <div className="flex flex-col gap-1">
          <h2 id="mission-scenario-heading" className="m-0 font-display text-heading font-medium">
            Choose the Mission Scenario
          </h2>
          <p className="m-0 max-w-[62ch] text-value text-ink-subtle">
            The objective, what counts as success, and what the class focuses on. One Scenario
            per period.
          </p>
        </div>
        )}
        <ScenarioPicker
          selectedScenarioId={scenarioId}
          onSelect={(id) => onMissionChange(chooseScenario(lessonId, id))}
          locked={false}
          bare
        />
      </section>
      )}

      {shows(2) && (
      <section className="flex flex-col gap-4" aria-labelledby="mission-area-heading">
        {heading && (
        <div className="flex flex-col gap-1">
          <h2 id="mission-area-heading" className="m-0 font-display text-heading font-medium">
            Draw the No-fly Zones
          </h2>
          <p className="m-0 max-w-[62ch] text-value text-ink-subtle">
            No-fly Zones in the Fleet&apos;s own frame. Not GPS. None is a normal answer.
          </p>
        </div>
        )}
        <MissionAreaEditor
          zones={zones}
          onChange={(next) => onMissionChange(setMissionZones(lessonId, next))}
          bare
          /*
           * The square the Scope is actually drawing, worked out the same way the Scope
           * works it out. A zone beyond it is real, raises Alerts, and appears on no view;
           * saying so here is what stops a Teacher drawing a boundary they will never see.
           */
          scopeSpace={scopeSpaceFor(drones)}
        />
      </section>
      )}

      {shows(3) && (
      <section className="flex flex-col gap-4" aria-labelledby="mission-teams-heading">
        {heading && (
        <div className="flex flex-col gap-1">
          <h2 id="mission-teams-heading" className="m-0 font-display text-heading font-medium">
            Teams and Drones
          </h2>
          <p className="m-0 max-w-[62ch] text-value text-ink-subtle">
            Put each team on a craft. Those craft become this Mission&apos;s fleet.
          </p>
        </div>
        )}
        <TeamsPanel book={book} drones={drones} bare />
        <SetMissionCraftButton
          lessonId={lessonId}
          craftIds={craftIds}
          mission={mission}
          onMissionChange={onMissionChange}
        />
        {/*
         * The other half of step 3, and the half the children write. Teams put craft in the
         * Mission; this says who is actually holding each one, and fills itself as tablets
         * join. It is here rather than on a screen of its own because it answers the same
         * question the step asks, and two surfaces holding one list means one is stale.
         */}
        <ClassroomSeatsPanel />
      </section>
      )}

      {shows(4) && (
      <section className="flex flex-col gap-4" aria-labelledby="mission-preflight-heading">
        {heading && (
        <div className="flex flex-col gap-1">
          <h2 id="mission-preflight-heading" className="m-0 font-display text-heading font-medium">
            Pre-flight check
          </h2>
          <p className="m-0 max-w-[62ch] text-value text-ink-subtle">
            Every craft on a team, not only the first. Propellers is the tick you make by hand.
          </p>
        </div>
        )}
        {craftIds.length === 0 ? (
          <p className="m-0 text-value text-ink-muted">
            No craft on a team yet. Put teams on Drones at step 3.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <TickEveryPropeller lessonId={lessonId} droneIds={craftIds} />
            {craftIds.map((droneId) => (
              <PreFlightSeven
                key={droneId}
                droneId={droneId}
                lessonId={lessonId}
                telemetry={telemetryFor(droneId)}
              />
            ))}
          </div>
        )}
      </section>
      )}

      {shows(5) && (
      <section className="flex flex-col gap-4" aria-labelledby="mission-brief-heading">
        {heading && (
        <div className="flex flex-col gap-1">
          <h2 id="mission-brief-heading" className="m-0 font-display text-heading font-medium">
            Mission rules and safety briefing
          </h2>
          <p className="m-0 max-w-[62ch] text-value text-ink-subtle">
            What the class hears before anyone asks to take off.
          </p>
        </div>
        )}
        <MissionBriefing lessonId={lessonId} scenarioId={scenarioId} bare />
        <SafetyBriefPanel lessonId={lessonId} />
        {mission !== null && teams.length > 0 ? (
          <div className="flex flex-col gap-4">
            <h3 className="label m-0">Team briefs to print</h3>
            <div className="grid grid-cols-1 gap-4 min-[48rem]:grid-cols-2">
              {teams.map((team) => (
                <TeamBriefPrint key={team.id} team={team} mission={mission} />
              ))}
            </div>
          </div>
        ) : null}
      </section>
      )}
    </div>
  )
}

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
 * The square of space the Scope is drawing right now, or null when nothing is placed.
 *
 * Worked out with the Scope's own `scopeWindow`, so the area editor's warning and the picture
 * it is warning about can never disagree about where the frame is. Null rather than a guess
 * before any Drone reports a position: there is no window then, and calling a zone "outside"
 * one would be inventing a boundary to complain about.
 */
function scopeSpaceFor(drones: readonly DroneState[]): ZoneWindow | null {
  const placed = drones.filter(
    (drone) => drone.telemetry?.position !== undefined && drone.status !== 'Offline',
  )
  if (placed.length === 0) return null
  const scope = scopeWindow(placed)
  return {
    westM: scope.westM,
    eastM: scope.eastM,
    southM: scope.southM,
    northM: scope.northM,
  }
}
