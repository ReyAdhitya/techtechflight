'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import {
  assignStudent,
  clearStudents,
  studentOf,
  currentExercise,
  readLogbook,
  recordCommand,
  readServerLogbook,
  runningLesson,
  subscribeLogbook,
} from '@/lib/logbook'
import type { CommandKind } from '@techtechflight/contract'
import { alertQueue, compareStrips, type DroneVitals, type VitalsAlert } from '@/lib/vitals'
import type { TrackedCommand } from '@/lib/command-tracker'
import { GuardedButton } from './ui/GuardedButton'
import {
  formatEndurance,
  formatSeparation,
  formatVerticalMovement,
  PHASE_PRESENTATION,
  SEVERITY_PRESENTATION,
} from '@/lib/vitals-presentation'
import { formatAge } from '@/lib/age'
import { formatBattery } from '@/lib/battery'
import { cn } from '@/lib/utils'
import { AttentionBar } from './AttentionBar'
import { LessonStrip } from './LessonStrip'
import { Scope } from './Scope'
import { useFleet } from './FleetProvider'
import { INSTRUMENT_FRAME } from '@/lib/frame'

/**
 * The Flight Control Center: the whole lesson at once, the way a controller reads a
 * sector.
 *
 * The Fleet board answers "can I hand this out" and is built to be glanced at. This is
 * built to be watched. The difference is that everything here says what to do next
 * rather than what is true — a controller does not need to be told a Drone is at 0.4m
 * and falling, they need to be told which aircraft needs them first.
 *
 * Order is deliberate and fixed: what needs you, then where everything is, then the
 * detail. A Teacher who looks up for two seconds should get the answer from the first
 * line without reading the rest.
 */
export function ControlScreen() {
  const { snapshot, vitals, acknowledge, isAcknowledged, acknowledgedAt, now, command, commandFor } =
    useFleet()
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)

  // Which Drone the Teacher is looking at. Choosing a mark on the scope lights its strip
  // and the reverse, because "which one is that" is the question the scope exists for.
  const [selected, setSelected] = useState<string | null>(null)

  const lesson = runningLesson(book)
  const state = snapshot.state
  const queue = useMemo(() => alertQueue(vitals, isAcknowledged), [vitals, isAcknowledged])

  if (!state) {
    return (
      <main id="content" tabIndex={-1} className="p-8">
        <p className="m-0 text-body text-ink-muted">Waiting for the first Fleet State.</p>
      </main>
    )
  }

  // Worst first, and among equals the one with more of them. Drone Name breaks the final
  // tie so a Fleet where nothing is wrong holds a stable order rather than reshuffling.
  const strips = [...vitals].sort(compareStrips)

  return (
    <main
      id="content"
      tabIndex={-1}
      className={cn(INSTRUMENT_FRAME, 'flex flex-col gap-6 p-4 min-[26rem]:p-8')}
    >
      {lesson && (
        <LessonStrip lesson={lesson} events={snapshot.history?.events ?? []} now={now} />
      )}

      <AttentionBar
        queue={queue}
        studentFor={(droneId) => studentOf(book, droneId)}
        onAcknowledge={(entry) => acknowledge(entry.droneId, entry)}
      />

      <section className="flex flex-col gap-3">
        <h2 className="label m-0">Where everything is</h2>
        <Scope
          drones={state.drones}
          vitals={vitals}
          selected={selected}
          onSelect={(droneId) => setSelected((current) => (current === droneId ? null : droneId))}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="label m-0">Every Drone</h2>
          {Object.keys(book.students).length > 0 && (
            <button
              type="button"
              onClick={clearStudents}
              className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted hover:border-ink hover:text-ink"
            >
              Everyone has put theirs down
            </button>
          )}
        </div>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {strips.map((entry) => (
            <FlightStrip
              key={entry.droneId}
              vitals={entry}
              student={studentOf(book, entry.droneId)}
              selected={selected === entry.droneId}
              onSelect={() => setSelected((current) => (current === entry.droneId ? null : entry.droneId))}
              isAcknowledged={isAcknowledged}
              acknowledgedAt={acknowledgedAt}
              now={now}
              command={(droneId, kind) => {
                command(droneId, kind)
                /*
                 * Noted against the Lesson as it is sent (C7), not when it resolves.
                 * What the report is a record of is what the Teacher asked for — a
                 * Command that produced nothing is still a thing that happened, and
                 * arguably the more interesting one.
                 */
                if (lesson) {
                  recordCommand(lesson.id, {
                    at: now,
                    droneId,
                    droneName: entry.callsign,
                    kind,
                  })
                }
              }}
              tracked={commandFor(entry.droneId)}
              exercise={lesson ? (currentExercise(lesson, now)?.exercise.name ?? null) : null}
            />
          ))}
        </ul>
      </section>
    </main>
  )
}

/**
 * One aircraft, one row.
 *
 * A strip is not a tile. A tile answers "what is this"; a strip answers "what is this
 * doing and how long have I got", which is why height carries its direction and charge
 * carries a time rather than only a percentage.
 */
/**
 * Who is flying this one.
 *
 * Edited in place rather than behind a dialog: a Teacher assigns six of these in the
 * thirty seconds before a lesson starts, and six dialogs is not thirty seconds. Held in
 * local state while being typed so the Logbook is not rewritten on every keystroke.
 */
function StudentField({
  droneId,
  droneName,
  student,
}: {
  droneId: string
  droneName: string
  student: string | null
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? student ?? ''

  return (
    <label className="flex items-center">
      <span className="visually-hidden">Who is flying {droneName}</span>
      <input
        value={value}
        placeholder="Add a name"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft !== null) assignStudent(droneId, draft)
          setDraft(null)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
        className={cn(
          'min-h-11 w-28 rounded-pill border bg-canvas px-3 py-1 text-value',
          student ? 'border-hairline text-ink' : 'border-dashed border-hairline text-ink-muted',
        )}
      />
    </label>
  )
}

function FlightStrip({
  vitals,
  student,
  selected,
  onSelect,
  isAcknowledged,
  acknowledgedAt,
  now,
  command,
  tracked,
  exercise,
}: {
  vitals: DroneVitals
  student: string | null
  selected: boolean
  onSelect: () => void
  isAcknowledged: (droneId: string, alert: VitalsAlert) => boolean
  acknowledgedAt: (droneId: string, alert: VitalsAlert) => number | null
  now: number
  command: (droneId: string, kind: CommandKind) => void
  tracked: TrackedCommand | null
  /** What it is meant to be doing. Shown beside what it is doing; nothing compares them. */
  exercise: string | null
}) {
  const phase = PHASE_PRESENTATION[vitals.phase]
  const separation = formatSeparation(vitals)

  return (
    <li
      onClick={onSelect}
      className={cn(
        'flex flex-col gap-2 rounded-surface border-l-2 bg-surface-1 p-3',
        vitals.alerts[0]
          ? SEVERITY_PRESENTATION[vitals.alerts[0].severity].className
          : 'border-hairline',
        // An outline rather than a fill: the tile's own severity colour has to keep
        // meaning what it means, and selection is a different kind of fact.
        selected && 'outline outline-2 outline-offset-2 outline-ink',
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {/*
          * Real height rather than the tap-row overlay used in Maintenance. A strip wraps
          * its alerts onto following lines, and those lines paint over an expanded hit
          * area, leaving the bottom half of the target unclickable. Here the row is tall
          * enough to carry a full-height link without moving anything.
          */}
        <Link
          prefetch={false}
                  href={`/drone?id=${encodeURIComponent(vitals.droneId)}`}
          className="inline-flex min-h-11 items-center font-display text-body font-medium text-ink no-underline hover:underline"
        >
          {vitals.callsign}
        </Link>
        <StudentField droneId={vitals.droneId} droneName={vitals.callsign} student={student} />
        <span className="text-value text-ink">{phase.label}</span>
        <span className="tnum text-value text-ink-subtle">{formatVerticalMovement(vitals)}</span>
        <span className="tnum text-value text-ink-subtle">
          {vitals.batteryFraction === null
            ? 'Charge unknown'
            : `${formatBattery(vitals.batteryFraction)} · ${formatEndurance(vitals.enduranceMs)}`}
        </span>
        <span className="tnum ml-auto text-value text-ink-muted">
          {vitals.responseAgeMs === null
            ? 'No response yet'
            : `Response ${formatAge(vitals.responseAgeMs)}`}
        </span>
      </div>

      {exercise && (
        // Intent beside behaviour. B7 was dropped, so the Teacher makes the comparison —
        // an Exercise does not declare which flight phase it expects, and inventing one
        // would raise alerts on a guess.
        <p className="m-0 text-value text-ink-subtle">Meant to be: {exercise}</p>
      )}

      {separation && (
        <p className="m-0 tnum text-value text-ink-subtle">Nearest aircraft: {separation}</p>
      )}

      {vitals.alerts.length > 0 && student && (
        // Repeated under the alerts on purpose. The alert is the thing being read, and
        // "go and speak to Priya" is more use than "go and look at Drone 3".
        <p className="m-0 text-value text-ink-subtle">Flown by {student}.</p>
      )}

      <CommandRow vitals={vitals} command={command} tracked={tracked} />

      {vitals.alerts.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {vitals.alerts.map((alert) => (
            <li key={alert.kind} className="flex flex-wrap items-baseline gap-2">
              <span
                className={cn(
                  'label rounded-pill border px-2 py-0.5',
                  SEVERITY_PRESENTATION[alert.severity].className,
                )}
              >
                {SEVERITY_PRESENTATION[alert.severity].label}
              </span>
              <span className="text-value text-ink">{alert.text}</span>
              {/*
                * Still here after it has been taken off the queue, and quieter. A Teacher
                * having seen a problem is not the same as the problem having stopped.
                */}
              {isAcknowledged(vitals.droneId, alert) && (
                <span className="tnum text-value text-ink-muted">
                  You have this — {formatAge(Math.max(0, now - (acknowledgedAt(vitals.droneId, alert) ?? now)))}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

/**
 * What a Teacher can ask of this aircraft.
 *
 * Land and Hold are always here because they are what gets reached for. Every Command in
 * this row takes energy out of the Drone; there is nothing here that makes one do more
 * than it is already doing, which is what makes a mistaken press survivable.
 *
 * Nothing said here is optimistic. "Sent" means sent, "waiting" means the Fleet took it
 * and the aircraft has not visibly done it yet, and a Command that produced no change
 * reads exactly like a Command that produced no change.
 */
function CommandRow({
  vitals,
  command,
  tracked,
}: {
  vitals: DroneVitals
  command: (droneId: string, kind: CommandKind) => void
  tracked: TrackedCommand | null
}) {
  const grounded = !vitals.airborne

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={grounded}
        onClick={() => command(vitals.droneId, 'land')}
        className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink disabled:cursor-default disabled:text-ink-muted"
      >
        Land
      </button>
      <button
        type="button"
        disabled={grounded}
        onClick={() => command(vitals.droneId, 'hold')}
        className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink disabled:cursor-default disabled:text-ink-muted"
      >
        Hold
      </button>
      <GuardedButton
        label="Stop — hold"
        confirmLabel="Press again to stop"
        onConfirm={() => command(vitals.droneId, 'emergency-stop')}
        className="ml-auto"
      />
      {tracked && <span className="text-value text-ink-muted">{describeCommand(tracked)}</span>}
    </div>
  )
}

function describeCommand(tracked: TrackedCommand): string {
  const asked = COMMAND_WORDS[tracked.command.kind]
  switch (tracked.stage) {
    case 'sent':
      return `${asked} — sent`
    case 'waiting':
      return `${asked} — waiting for a response`
    case 'done':
      return `${asked} — done`
    case 'refused':
      return tracked.reason ?? `${asked} — refused`
    case 'no-response':
      // Not "failed". A Drone that ignored a request and one that stopped talking are
      // not distinguishable from here.
      return `${asked} — sent, no response since`
  }
}

const COMMAND_WORDS: Readonly<Record<CommandKind, string>> = {
  land: 'Land',
  hold: 'Hold',
  'auto-land': 'Auto-land',
  'emergency-stop': 'Stop',
}
