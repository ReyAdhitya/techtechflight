'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { isUsable, needsAttention, type DroneState } from '@techtechflight/contract'
import {
  isStudentAbsent,
  readLogbook,
  readServerLogbook,
  remedialQueueOf,
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
import { STATUS_PRESENTATION } from '@/lib/status-presentation'
import { formatClock } from '@/lib/telemetry-presentation'
import { cn } from '@/lib/utils'
import { AbsentReassignNotice } from './AbsentReassignNotice'
import { AssignEveryoneButton } from './AssignEveryoneButton'
import { AssignmentColumn } from './AssignmentColumn'
import { AssignmentUndoButton } from './AssignmentUndoButton'
import { BatteryOnChargeTick } from './BatteryOnChargeTick'
import { CraftReturnedTick } from './CraftReturnedTick'
import { ExerciseList } from './ExerciseList'
import { LessonPlanWizard } from './LessonPlanWizard'
import { LessonPrepPanel } from './LessonPrepPanel'
import { LessonTemplatesPack } from './LessonTemplatesPack'
import { PackdownChecklist } from './PackdownChecklist'
import { SafetyBriefPanel } from './SafetyBriefPanel'
import { SwapPupilsControl } from './SwapPupilsControl'
import { WaitingList } from './WaitingList'
import { useFleet } from './FleetProvider'
import { formatElapsed } from './LessonStrip'
import { LogbookLocationNote } from './LogbookLocationNote'
import { BeforeAfterScores } from './BeforeAfterScores'
import { LessonWarmUp } from './LessonWarmUp'
import { StatusGlyph } from './StatusBadge'
import {
  readyBoardLabel,
  readyBoardSummary,
  READY_BOARD_PRESENTATION,
} from './walls/ready-mapping'
import { READING_FRAME } from '@/lib/frame'
import type { DroneVitals } from '@/lib/vitals'
import { LessonBookmarkControl } from './LessonBookmarkControl'
import { LessonIncidentNoteControl } from './LessonIncidentNoteControl'
import { RemedialQueue } from './RemedialQueue'
import { ScenarioPicker } from './ScenarioPicker'
import { MissionAreaEditor } from './MissionAreaEditor'
import { TeamsPanel } from './TeamsPanel'
import { PreFlightSeven } from './PreFlightSeven'
import { MissionBriefing } from './MissionBriefing'
import { TeamBriefPrint } from './TeamBriefPrint'
import { enclosesAnything, type Zone } from '@/lib/airspace'
import { emptyMission, type ScenarioId } from '@/lib/mission'
import { readTeams } from '@/lib/teams'
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
  const drones = snapshot.state?.drones ?? []

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
      <LogbookLocationNote />

      {lesson ? (
        <LessonUnderWay lesson={lesson} now={now} drones={drones} book={book} />
      ) : (
        <PreFlight drones={drones} vitals={vitals} book={book} now={now} snapshot={snapshot} />
      )}

      <RemedialQueue queue={remedialQueueOf(book)} heading="Remedial queue" />

      <PastLessons lessons={book.lessons.filter((record) => record.endedAt !== null)} />
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
  snapshot,
}: {
  drones: readonly DroneState[]
  vitals: readonly DroneVitals[]
  book: ReturnType<typeof readLogbook>
  now: number
  snapshot: FleetSnapshot
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
  const { ready, notReady } = readyBoardSummary(readyLabels)

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 flex items-baseline gap-3 font-display text-summary font-medium">
          <span className="tnum tracking-[-0.02em]">{usable.length}</span>
          <span className="text-heading text-ink-subtle">
            of {drones.length} serviceable
          </span>
        </h1>
        <p className="m-0 text-body text-ink-muted">
          {usable.length === 0
            ? 'None serviceable yet. The list below is what stands in the way.'
            : `Sufficient for ${usable.length} ${usable.length === 1 ? 'Student' : 'Students'} airborne at once.`}
        </p>
      </div>

      {vitals.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="label m-0">Pre-flight check</h2>
          <p className="m-0 font-display text-summary font-medium text-ink">
            <span className="tnum">{ready}</span>
            {' ready · '}
            <span className="tnum">{notReady}</span>
            {' not ready'}
          </p>
          {notReady > 0 && (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {vitals.map((entry) => {
                const boardLabel = readyBoardLabel(entry)
                if (boardLabel === 'Ready') return null
                const presentation = READY_BOARD_PRESENTATION[boardLabel]
                return (
                  <li key={entry.droneId}>
                    <Link
                      prefetch={false}
                      href={`/drone?id=${encodeURIComponent(entry.droneId)}`}
                      className={cn(
                        'flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-surface border-l-2 bg-surface-1 py-3 pl-3 pr-4 no-underline',
                        boardLabel === 'Fault' ? 'border-status-fault' : 'border-status-not-ready',
                      )}
                    >
                      <span className="font-display text-body font-medium text-ink">
                        {entry.callsign}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-2 text-value',
                          presentation.className,
                        )}
                      >
                        <StatusGlyph shape={presentation.shape} />
                        {presentation.label}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {blocking.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="label m-0">Standing in the way</h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {blocking.map((drone) => (
              <li key={drone.id}>
                <Link
                  prefetch={false}
                  href={`/drone?id=${encodeURIComponent(drone.id)}`}
                  className={cn(
                    // py-3 rather than py-2: at py-2 the row came to 41px, just under the
                    // 44px a finger needs, and this is the list a Teacher works through.
                    'flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-surface border-l-2 bg-surface-1 py-3 pl-3 pr-4 no-underline',
                    drone.status === 'Fault' ? 'border-status-fault' : 'border-status-not-ready',
                  )}
                >
                  <span className="font-display text-body font-medium text-ink">
                    {drone.name}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-2 text-value',
                      drone.status === 'Fault'
                        ? 'text-status-fault'
                        : 'text-status-not-ready',
                    )}
                  >
                    <StatusGlyph shape={STATUS_PRESENTATION[drone.status].shape} />
                    {STATUS_PRESENTATION[drone.status].label}
                  </span>
                  <span className="text-value text-ink-subtle">
                    {drone.status === 'Not Ready'
                      ? 'Place on charge. Projected serviceable before the lesson.'
                      : 'Withdraw from service. Not projected serviceable before the lesson.'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {withheld.length > 0 && (
        <p className="m-0 text-value text-ink-subtle">
          {withheld.length} {withheld.length === 1 ? 'Drone is' : 'Drones are'} out of service
          by your own decision and are not counted:{' '}
          {withheld.map((drone) => drone.name).join(', ')}.
        </p>
      )}

      <MissionPrep drones={drones} book={book} snapshot={snapshot} lessonId={null} />

      <LessonPrepPanel drones={drones} book={book} />

      <SafetyBriefPanel lessonId={null} />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <AssignEveryoneButton
            droneIds={drones.map((drone) => drone.id)}
          />
          <AssignmentUndoButton
            canUndo={canUndoAssignment()}
            onUndo={() => {
              undoLastAssignment()
              setUndoTick((n) => n + 1)
            }}
          />
        </div>
        <SwapPupilsControl
          options={drones.map((drone) => ({
            droneId: drone.id,
            droneName: drone.name,
            studentName: studentOf(book, drone.id),
          }))}
          onSwapped={() => setUndoTick((n) => n + 1)}
        />
        <AssignmentColumn drones={drones} book={book} />
        <WaitingList book={book} />
        {book.roster.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="label m-0">Mark absent</h2>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {book.roster.map((student) =>
                student.studentId === '' || isStudentAbsent(book, student.studentId) ? null : (
                  <li key={student.studentId}>
                    <button
                      type="button"
                      onClick={() => {
                        withAssignmentUndo(() => {
                          setAbsentNotice(markAbsentAndFreeCraft(student.studentId))
                        })
                        setUndoTick((n) => n + 1)
                      }}
                      className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
                    >
                      {student.name} absent
                    </button>
                  </li>
                ),
              )}
            </ul>
            <AbsentReassignNotice
              result={absentNotice}
              droneNames={Object.fromEntries(drones.map((d) => [d.id, d.name]))}
            />
          </div>
        )}
      </div>

      <LessonPlanWizard
        label={label}
        onLabelChange={setLabel}
        exercises={exercises}
        onExercisesChange={setExercises}
        usableCount={usable.length}
        fleetSize={drones.length}
        onStart={() =>
          startLesson(label, usable.length, drones.length, now || Date.now(), exercises)
        }
      />
      <LessonTemplatesPack onPick={() => {}} />
      <ExerciseList exercises={exercises} onChange={setExercises} />

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
        <h1 className="m-0 font-display text-heading font-medium">{lesson.label}
          <BeforeAfterScores scores={{ before: null, after: null }} /></h1>
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


function NextStepHint({ children }: { readonly children: string }) {
  return (
    <p className="m-0 text-value text-ink-muted">
      <span className="label">Next — </span>
      {children}
    </p>
  )
}

/**
 * Mission prep on the Lesson screen — Scenario through team briefs in workflow order.
 *
 * Each block states what follows so a Teacher can work down the list before takeoff.
 * PreFlightSeven mounts once teams exist so it does not share a heading with the Ready
 * wall summary above.
 */
function MissionPrep({
  drones,
  book,
  snapshot,
  lessonId,
}: {
  readonly drones: readonly DroneState[]
  readonly book: ReturnType<typeof readLogbook>
  readonly snapshot: FleetSnapshot
  readonly lessonId: string | null
}) {
  const [scenarioId, setScenarioId] = useState<ScenarioId | null>(null)
  const [zones, setZones] = useState<readonly Zone[]>([])

  const teams = readTeams()
  const hasScenario = scenarioId !== null
  const hasMissionZone = zones.some((zone) => zone.kind === 'mission' && enclosesAnything(zone))
  const hasTeams = teams.some((team) => team.studentIds.length > 0 || team.droneId !== null)

  const focusDroneId = drones[0]?.id ?? null
  const telemetry =
    focusDroneId === null
      ? null
      : (snapshot.state?.drones.find((drone) => drone.id === focusDroneId)?.telemetry ?? null)

  const draftMission =
    scenarioId === null
      ? null
      : {
          ...emptyMission('mission-prep-draft', scenarioId, ''),
          zones,
        }

  return (
    <div className="flex flex-col gap-5 border-t border-hairline pt-5">
      <div className="flex flex-col gap-1">
        <h2 className="label m-0">Mission prep</h2>
        <p className="m-0 text-value text-ink-subtle">
          Work through Scenario, area, teams, pre-flight and briefing before the class takes
          off.
        </p>
      </div>

      <ScenarioPicker
        selectedScenarioId={scenarioId}
        onSelect={setScenarioId}
        locked={false}
      />
      <NextStepHint>Draw the Mission area and any no-fly zones.</NextStepHint>

      {hasScenario ? (
        <>
          <MissionAreaEditor zones={zones} onChange={setZones} />
          <NextStepHint>Assign each team to a craft.</NextStepHint>
        </>
      ) : null}

      {hasScenario && hasMissionZone ? (
        <>
          <TeamsPanel book={book} drones={drones} />
          <NextStepHint>Tick each craft’s pre-flight check when it is ready.</NextStepHint>
        </>
      ) : null}

      {hasScenario && hasMissionZone && hasTeams && focusDroneId !== null ? (
        <>
          <PreFlightSeven
            droneId={focusDroneId}
            lessonId={lessonId}
            telemetry={telemetry}
          />
          <NextStepHint>Walk the class through the Mission rules and safety brief.</NextStepHint>
        </>
      ) : null}

      {hasScenario && hasMissionZone && hasTeams ? (
        <>
          <MissionBriefing lessonId={lessonId} scenarioId={scenarioId} />
          <NextStepHint>Print a team brief for each group before granting clearance.</NextStepHint>
        </>
      ) : null}

      {draftMission !== null && teams.length > 0 ? (
        <div className="flex flex-col gap-4">
          <h2 className="label m-0">Team briefs to print</h2>
          <div className="grid grid-cols-1 gap-4 min-[48rem]:grid-cols-2">
            {teams.map((team) => (
              <TeamBriefPrint key={team.id} team={team} mission={draftMission} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function PastLessons({ lessons }: { lessons: readonly LessonRecord[] }) {
  if (lessons.length === 0) return null

  return (
    <section className="flex flex-col gap-3 border-t border-hairline pt-6">
      <h2 className="label m-0">Earlier lessons</h2>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {lessons.slice(0, 12).map((lesson) => (
          <li
            key={lesson.id}
            className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-surface border border-hairline bg-surface-1 p-3"
          >
            <span className="font-display text-body font-medium">{lesson.label}</span>
            <span className="tnum text-value text-ink-subtle">
              {formatClock(lesson.startedAt)}
              {lesson.endedAt && ` – ${formatClock(lesson.endedAt)}`}
            </span>
            <span className="tnum text-value text-ink-muted">
              {lesson.readyAtStart} of {lesson.fleetSize} ready at the start
            </span>
            <span
              className={cn(
                'tnum ml-auto text-value',
                lesson.incidents.length > 0 ? 'text-status-fault' : 'text-ink-subtle',
              )}
            >
              {lesson.incidents.length === 0
                ? 'No incidents'
                : `${lesson.incidents.length} ${
                    lesson.incidents.length === 1 ? 'incident' : 'incidents'
                  }`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

