'use client'

import { useState, useSyncExternalStore } from 'react'
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
import { STATUS_PRESENTATION } from '@/lib/status-presentation'
import { formatClock } from '@/lib/telemetry-presentation'
import { cn } from '@/lib/utils'
import { AssignmentColumn } from './AssignmentColumn'
import { LessonPlanWizard } from './LessonPlanWizard'
import { LessonPrepPanel } from './LessonPrepPanel'
import { useFleet } from './FleetProvider'
import { formatElapsed } from './LessonStrip'
import { LogbookLocationNote } from './LogbookLocationNote'
import { LessonWarmUp } from './LessonWarmUp'
import { StatusGlyph } from './StatusBadge'
import { TrainingWheelsBanner, TrainingWheelsToggle } from './TrainingWheelsBanner'
import {
  readyBoardLabel,
  readyBoardSummary,
  READY_BOARD_PRESENTATION,
} from './walls/ready-mapping'
import { READING_FRAME } from '@/lib/frame'
import type { DroneVitals } from '@/lib/vitals'

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <TrainingWheelsBanner className="flex-1" />
        <TrainingWheelsToggle />
      </div>

      {lesson ? (
        <LessonUnderWay lesson={lesson} now={now} />
      ) : (
        <PreFlight drones={drones} vitals={vitals} book={book} now={now} />
      )}

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
}: {
  drones: readonly DroneState[]
  vitals: readonly DroneVitals[]
  book: ReturnType<typeof readLogbook>
  now: number
}) {
  const [label, setLabel] = useState('')
  const [exercises, setExercises] = useState<readonly Exercise[]>([])

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

      <LessonPrepPanel drones={drones} book={book} />

      <AssignmentColumn drones={drones} book={book} />

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
function LessonUnderWay({ lesson, now }: { lesson: LessonRecord; now: number }) {
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
        <h1 className="m-0 font-display text-heading font-medium">{lesson.label}</h1>
        <p className="tnum m-0 text-value text-ink-subtle">
          {formatElapsed(Math.max(0, now - lesson.startedAt))} so far
        </p>
      </div>

      <p className="m-0 text-body text-ink-muted">
        Monitor from the Flight Control Center. Every item requiring action is listed there, in
        the order it requires action, and the lesson is ended from there.
      </p>

      <Link
        href="/control"
        className="min-h-11 w-fit cursor-pointer rounded-pill border-0 bg-ink px-5 py-2 text-body font-medium text-canvas no-underline"
      >
        Go to the Flight Control Center
      </Link>
    </section>
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

