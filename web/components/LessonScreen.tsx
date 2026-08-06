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
import { MissionBriefing } from './MissionBriefing'
import { TeamBriefPrint } from './TeamBriefPrint'
import { ClassroomCodePanel } from './ClassroomCodePanel'
import type { Mission } from '@/lib/mission'
import { readTeams } from '@/lib/teams'
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
 * Set this Mission up, and start or end the period. That is the whole screen.
 *
 * One scrolling page — Scenario, zones, teams, pre-flight, brief, then start. The
 * Mission-run left rail and `?step=` gating are gone: a Teacher at 08:55 should see the
 * work, not a wizard. Fleet health craft-by-craft, finished Lessons, pack-down and where
 * records live stay on Fleet, Reports, Control and Settings.
 */
export function LessonScreen() {
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
      className={cn(READING_FRAME, 'flex flex-col gap-8 p-4 min-[26rem]:p-8')}
    >
      <header className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-heading font-medium text-balance">
          Set this Mission up
        </h1>
        <p className="m-0 max-w-[62ch] text-value text-ink-subtle">
          Choose the Scenario, draw the airspace, put teams on craft, tick pre-flight, brief
          the class, then start the period. Live flying is on Control.
        </p>
      </header>

      {lesson ? (
        <LessonUnderWay lesson={lesson} now={now} book={book} />
      ) : (
        <PreFlight drones={drones} vitals={vitals} book={book} now={now} />
      )}

      <MissionPrep
        drones={drones}
        book={book}
        snapshot={snapshot}
        lessonId={lessonId}
        mission={mission}
        onMissionChange={setMission}
      />
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
        Monitor from the Flight Control Center. Students join on an iPad with the classroom
        code. The lesson is ended from Control.
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

/**
 * Mission set-up as one column — every block visible, no step rail.
 */
function MissionPrep({
  drones,
  book,
  snapshot,
  lessonId,
  mission,
  onMissionChange,
}: {
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
  const craftIds = missionCraftIds(teams, mission)
  const telemetryFor = (droneId: string) =>
    snapshot.state?.drones.find((drone) => drone.id === droneId)?.telemetry ?? null

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4" aria-labelledby="mission-scenario-heading">
        <div className="flex flex-col gap-1">
          <h2 id="mission-scenario-heading" className="m-0 font-display text-heading font-medium">
            Choose the Mission Scenario
          </h2>
          <p className="m-0 max-w-[62ch] text-value text-ink-subtle">
            The objective, what counts as success, and what the class focuses on. One Scenario
            per period.
          </p>
        </div>
        <ScenarioPicker
          selectedScenarioId={scenarioId}
          onSelect={(id) => onMissionChange(chooseScenario(lessonId, id))}
          locked={false}
          bare
        />
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="mission-area-heading">
        <div className="flex flex-col gap-1">
          <h2 id="mission-area-heading" className="m-0 font-display text-heading font-medium">
            Draw the Mission area
          </h2>
          <p className="m-0 max-w-[62ch] text-value text-ink-subtle">
            Mission Zone and No-fly Zones in the Fleet&apos;s own frame — not GPS.
          </p>
        </div>
        <MissionAreaEditor
          zones={zones}
          onChange={(next) => onMissionChange(setMissionZones(lessonId, next))}
          bare
        />
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="mission-teams-heading">
        <div className="flex flex-col gap-1">
          <h2 id="mission-teams-heading" className="m-0 font-display text-heading font-medium">
            Teams and Drones
          </h2>
          <p className="m-0 max-w-[62ch] text-value text-ink-subtle">
            Put each team on a craft. Those craft become this Mission&apos;s fleet.
          </p>
        </div>
        <TeamsPanel book={book} drones={drones} bare />
        <SetMissionCraftButton
          lessonId={lessonId}
          craftIds={craftIds}
          mission={mission}
          onMissionChange={onMissionChange}
        />
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="mission-preflight-heading">
        <div className="flex flex-col gap-1">
          <h2 id="mission-preflight-heading" className="m-0 font-display text-heading font-medium">
            Pre-flight check
          </h2>
          <p className="m-0 max-w-[62ch] text-value text-ink-subtle">
            Every craft on a team, not only the first. Propellers is the tick you make by hand.
          </p>
        </div>
        {craftIds.length === 0 ? (
          <p className="m-0 text-value text-ink-muted">
            No craft on a team yet. Assign teams and Drones above.
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
        )}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="mission-brief-heading">
        <div className="flex flex-col gap-1">
          <h2 id="mission-brief-heading" className="m-0 font-display text-heading font-medium">
            Mission rules and safety briefing
          </h2>
          <p className="m-0 max-w-[62ch] text-value text-ink-subtle">
            What the class hears before anyone asks to take off.
          </p>
        </div>
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
