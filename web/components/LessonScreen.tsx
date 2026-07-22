'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { isUsable, needsAttention, type DroneState } from '@techtechflight/contract'
import {
  addIncident,
  endLesson,
  readLogbook,
  readServerLogbook,
  runningLesson,
  serviceStateOf,
  startLesson,
  subscribeLogbook,
  tallyEvents,
  type LessonRecord,
} from '@/lib/logbook'
import { STATUS_PRESENTATION } from '@/lib/status-presentation'
import { describeEvent, formatClock } from '@/lib/telemetry-presentation'
import { cn } from '@/lib/utils'
import { EventTimeline } from './EventTimeline'
import { useFleet } from './FleetProvider'
import { StatusGlyph } from './StatusBadge'

/**
 * The lesson, from the check before it to the summary after it.
 *
 * This is the workflow the board was always implying and never quite supported. A
 * Teacher does not glance at a status board out of curiosity — they glance at it at
 * 08:55 to find out whether the next hour is going to work, and again afterwards to find
 * out what broke. Everything here is built around those two moments.
 */
export function LessonScreen() {
  const { snapshot, now } = useFleet()
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
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 min-[26rem]:p-8"
    >
      {lesson ? (
        <RunningLesson lesson={lesson} drones={drones} now={now} />
      ) : (
        <PreFlight drones={drones} book={book} now={now} />
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
  book,
  now,
}: {
  drones: readonly DroneState[]
  book: ReturnType<typeof readLogbook>
  now: number
}) {
  const [label, setLabel] = useState('')

  const withheld = drones.filter((drone) => serviceStateOf(book, drone.id) === 'out-of-service')
  const withheldIds = new Set(withheld.map((drone) => drone.id))
  // A Drone the Teacher has taken out of service is not available however healthy it is.
  const usable = drones.filter((drone) => isUsable(drone.status) && !withheldIds.has(drone.id))
  const blocking = drones.filter(
    (drone) => needsAttention(drone.status) && !withheldIds.has(drone.id),
  )

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 flex items-baseline gap-3 font-display text-summary font-medium">
          <span className="tnum tracking-[-0.02em]">{usable.length}</span>
          <span className="text-heading text-ink-subtle">
            of {drones.length} ready to hand out
          </span>
        </h1>
        <p className="m-0 text-body text-ink-muted">
          {usable.length === 0
            ? 'Nothing is ready yet. The list below is what stands in the way.'
            : `Enough for ${usable.length} ${usable.length === 1 ? 'Student' : 'Students'} flying at once.`}
        </p>
      </div>

      {blocking.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="label m-0">Standing in the way</h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {blocking.map((drone) => (
              <li key={drone.id}>
                <Link
                  href={`/drone?id=${encodeURIComponent(drone.id)}`}
                  className={cn(
                    'flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-surface border-l-2 bg-surface-1 py-2 pl-3 pr-4 no-underline',
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
                      ? 'Put it on charge — it should come back before the lesson.'
                      : 'Set this one aside. It will not be right in time.'}
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

      <div className="flex flex-wrap items-end gap-3 border-t border-hairline pt-5">
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
          onClick={() => startLesson(label, usable.length, drones.length, now || Date.now())}
        >
          Start the lesson
        </button>
      </div>
    </section>
  )
}

/**
 * The lesson while it is happening.
 *
 * The only screen in the product that is watched rather than glanced at, so it is the
 * only one that leads with a number that moves. Incidents are pulled from the ground
 * station's own history rather than from anything this screen observed, so closing the
 * laptop and opening it again does not lose the last ten minutes.
 */
function RunningLesson({
  lesson,
  drones,
  now,
}: {
  lesson: LessonRecord
  drones: readonly DroneState[]
  now: number
}) {
  const { snapshot } = useFleet()
  const flying = drones.filter((drone) => drone.status === 'Flying').length
  const ready = drones.filter((drone) => isUsable(drone.status)).length
  const attention = drones.filter((drone) => needsAttention(drone.status)).length

  /*
   * Everything since the lesson began, not just what went wrong. The timeline below only
   * wants the incidents, but the tally kept at the end needs the routine events too — a
   * fault means something quite different in two flights than it does in fifty.
   */
  const sinceStart = useMemo(
    () => (snapshot.history?.events ?? []).filter((event) => event.at >= lesson.startedAt),
    [snapshot.history, lesson.startedAt],
  )
  const incidents = useMemo(
    () => sinceStart.filter((event) => event.severity !== 'routine'),
    [sinceStart],
  )

  const elapsed = Math.max(0, now - lesson.startedAt)

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="flex flex-col gap-1">
          <span className="label">Lesson under way</span>
          <h1 className="m-0 font-display text-heading font-medium">{lesson.label}</h1>
        </div>
        <p className="tnum m-0 font-display text-summary font-medium">{formatElapsed(elapsed)}</p>
      </div>

      <dl className="m-0 grid grid-cols-2 gap-4 border-y border-hairline py-4 sm:grid-cols-4">
        <Figure label="Flying now" value={flying} />
        <Figure label="Ready to swap in" value={ready} />
        <Figure
          label="Need attention"
          value={attention}
          tone={attention > 0 ? 'attention' : undefined}
        />
        <Figure
          label="Incidents"
          value={incidents.length}
          tone={incidents.length > 0 ? 'fault' : undefined}
        />
      </dl>

      <div className="flex flex-col gap-3">
        <h2 className="label m-0">Since the lesson started</h2>
        <EventTimeline
          events={incidents}
          now={now}
          emptyMessage="Nothing has gone wrong. Faults and flat batteries will appear here."
        />
      </div>

      <button
        type="button"
        className="min-h-11 w-fit cursor-pointer rounded-pill border border-hairline bg-transparent px-5 py-2 text-body font-medium text-ink hover:border-ink"
        onClick={() => {
          const at = now || Date.now()
          /*
           * The incidents are written into the record as the lesson closes rather than
           * recomputed later. The ground station's history is bounded, so by next week
           * these events will have aged out of it — and a lesson summary that quietly
           * emptied itself would be worse than no summary at all.
           */
          for (const event of incidents) {
            addIncident(lesson.id, {
              at: event.at,
              text: `${describeEvent(event)}${event.detail ? ` — ${event.detail}` : ''}`,
              severity: event.severity === 'fault' ? 'fault' : 'attention',
              droneId: event.droneId,
              droneName: event.droneName,
            })
          }
          /*
           * The counts go in at the same moment and for the same reason: this is the last
           * point at which the events still exist. Maintenance reads them back so "which
           * Drone keeps giving trouble" survives the ground station being restarted.
           */
          endLesson(lesson.id, at, tallyEvents(sinceStart))
        }}
      >
        End the lesson
      </button>
    </section>
  )
}

function Figure({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'attention' | 'fault' | undefined
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="label">{label}</dt>
      <dd
        className={cn(
          'tnum m-0 font-display text-heading font-medium',
          tone === 'fault' && 'text-status-fault',
          tone === 'attention' && 'text-status-not-ready',
        )}
      >
        {value}
      </dd>
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

function formatElapsed(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const seconds = Math.floor((ms % 60_000) / 1_000)
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}`
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
