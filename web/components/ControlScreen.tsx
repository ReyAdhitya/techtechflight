'use client'

import { useMemo, useState, useSyncExternalStore, useEffect } from 'react'
import Link from 'next/link'
import {
  assignStudent,
  clearStudents,
  studentOf,
  currentExercise,
  readLogbook,
  recordCommand,
  readServerLogbook,
  remedialQueueOf,
  runningLesson,
  subscribeLogbook,
} from '@/lib/logbook'
import type { CommandKind } from '@techtechflight/contract'
import { alertQueue, type DroneVitals, type VitalsAlert } from '@/lib/vitals'
import type { TrackedCommand } from '@/lib/command-tracker'
import {
  formatCoordinates,
  formatSeparation,
  formatVerticalMovement,
  SEVERITY_PRESENTATION,
} from '@/lib/vitals-presentation'
import { formatAge } from '@/lib/age'
import { formatBattery } from '@/lib/battery'
import { formatBatteryTimeBudget } from '@/lib/battery-budget'
import { cn } from '@/lib/utils'
import { recordGhostPaths, type GhostPathStore } from '@/lib/scope-ghost-paths'
import { AttentionBar } from './AttentionBar'
import { RemedialQueue } from './RemedialQueue'
import { ClassAverageStrip } from './ClassAverageStrip'
import { ControlAttentionQueue } from './ControlAttentionQueue'
import { CameraSlide } from './CameraSlide'
import { EndPeriodLandPrompt } from './EndPeriodLandPrompt'
import { HeightCeilingBanner } from './HeightCeilingBanner'
import { LessonStrip } from './LessonStrip'
import { LessonTimerBanner } from './walls/LessonTimerBanner'
import { LiveHeadcount } from './LiveHeadcount'
import { SimLandAllButton } from './SimLandAllButton'
import { QuietModeToggle } from './QuietModeToggle'
import { PeerDemoSpotlight } from './PeerDemoSpotlight'
import { Scope } from './Scope'
import { ScopeCameraFilmstrip } from './ScopeCameraFilmstrip'
import { TrainingWheelsBanner, TrainingWheelsToggle } from './TrainingWheelsBanner'
import { useFleet } from './FleetProvider'
import { useTeacherPinGate } from './useTeacherPinGate'
import { useTrainingWheelsOptional } from '@/lib/training-wheels'
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
  const { snapshot, vitals, acknowledge, isAcknowledged, acknowledgedAt, now, command, commandFor, scenarios } =
    useFleet()
  const trainingWheels = useTrainingWheelsOptional()?.enabled ?? false
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)

  // Which Drone the Teacher is looking at. Choosing a mark on the scope lights its strip
  // and the reverse, because "which one is that" is the question the scope exists for.
  const [selected, setSelected] = useState<string | null>(null)
  // Camera slide is watch-only chrome — not a Command (C9). Settings still owns the map.
  const [cameraDroneId, setCameraDroneId] = useState<string | null>(null)
  const [ghostPaths, setGhostPaths] = useState<GhostPathStore>(() => new Map())
  const [spotlightDroneId, setSpotlightDroneId] = useState<string | null>(null)
  const [endPeriodOpen, setEndPeriodOpen] = useState(false)
  const { ensureUnlocked, overlay } = useTeacherPinGate()
  const [quietMode, setQuietMode] = useState(false)

  const lesson = runningLesson(book)
  const state = snapshot.state
  const queue = useMemo(() => alertQueue(vitals, isAcknowledged), [vitals, isAcknowledged])
  const remedial = remedialQueueOf(book)

  useEffect(() => {
    if (!state) return
    setGhostPaths((current) => recordGhostPaths(current, state.drones, now))
  }, [state, now])

  if (!state) {
    return (
      <main id="content" tabIndex={-1} className="p-8">
        <p className="m-0 text-body text-ink-muted">Waiting for the first Fleet State.</p>
      </main>
    )
  }

  // Board order only — same muscle memory as the Fleet tiles. Urgency lives on the
  // Attention bar (`alertQueue`); reshuffling strips when alerts appear or clear is what
  // made this list dizzying. `FleetState.drones` (and thus `vitals`) are already that order.
  const strips = vitals
  const airborneCount = vitals.filter((entry) => entry.airborne).length
  const groundedCount = vitals.length - airborneCount
  const selectedVitals = selected ? (vitals.find((entry) => entry.droneId === selected) ?? null) : null
  const cameraDrone =
    cameraDroneId === null
      ? null
      : (state.drones.find((drone) => drone.id === cameraDroneId) ?? null)
  const spotlightDrone =
    spotlightDroneId === null
      ? null
      : (state.drones.find((drone) => drone.id === spotlightDroneId) ?? null)

  const focusStrip = (droneId: string) => {
    setSelected(droneId)
    requestAnimationFrame(() => {
      document.getElementById(`control-strip-${droneId}`)?.scrollIntoView({ block: 'nearest' })
    })
  }

  const issueCommand = (droneId: string, kind: CommandKind, callsign: string) => {
    ensureUnlocked(() => {
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
          droneName: callsign,
          kind,
        })
      }
    })
  }

  const releaseStop = (_droneId: string, reset: () => void) => {
    ensureUnlocked(reset)
  }

  return (
    <main
      id="content"
      tabIndex={-1}
      className={cn(INSTRUMENT_FRAME, 'flex flex-col gap-6 p-4 min-[26rem]:p-8')}
    >
      {lesson && (
        <LessonStrip lesson={lesson} events={snapshot.history?.events ?? []} now={now} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <TrainingWheelsBanner className="flex-1" />
        <TrainingWheelsToggle />
      </div>
      {spotlightDrone && (
        <PeerDemoSpotlight
          drone={spotlightDrone}
          student={studentOf(book, spotlightDrone.id)}
          scenarios={scenarios}
          onClose={() => setSpotlightDroneId(null)}
        />
      )}
      <LessonTimerBanner
        initialSeconds={45 * 60}
        onExpire={() => setEndPeriodOpen(true)}
      />

      <EndPeriodLandPrompt
        open={endPeriodOpen}
        onClose={() => setEndPeriodOpen(false)}
        onLandAll={
          scenarios
            ? () => {
                for (const entry of vitals) {
                  if (entry.airborne) scenarios.setAltitude(entry.droneId, 0)
                }
              }
            : null
        }

      <AttentionBar
        queue={queue}
        studentFor={(droneId) => studentOf(book, droneId)}
        onAcknowledge={(entry) => acknowledge(entry.droneId, entry)}
      />

      <RemedialQueue queue={remedial} />
      <ClassAverageStrip vitals={vitals} />
      <ControlAttentionQueue
        queue={queue}
        studentFor={(droneId) => studentOf(book, droneId)}
        selected={selected}
        onSelect={(entry) => focusStrip(entry.droneId)}
      />

      <HeightCeilingBanner vitals={vitals} />

      <section className="flex flex-col gap-3">
        <h2 className="label m-0">Where everything is</h2>
        <Scope
          drones={state.drones}
          vitals={vitals}
          ghostPaths={ghostPaths}
          selected={selected}
          onSelect={(droneId) => setSelected((current) => (current === droneId ? null : droneId))}
          selectedPanel={
            selectedVitals ? (
              <ScopeSelectedDock
                vitals={selectedVitals}
                student={studentOf(book, selectedVitals.droneId)}
                command={(droneId, kind) =>
                  issueCommand(droneId, kind, selectedVitals.callsign)
                }
                onReleaseStop={
                  scenarios
                    ? () =>
                        releaseStop(selectedVitals.droneId, () =>
                          scenarios.resetEmergencyStop(selectedVitals.droneId),
                        )
                    : null
                }
                tracked={commandFor(selectedVitals.droneId)}
                onClear={() => setSelected(null)}
                onOpenCamera={() => setCameraDroneId(selectedVitals.droneId)}
                hideStop={quietMode}
                hideStop={trainingWheels}
                onSpotlight={() => setSpotlightDroneId(selectedVitals.droneId)}
              />
            ) : null
          }
        />
        <ScopeCameraFilmstrip
          vitals={vitals}
          drones={state.drones}
          scenarios={scenarios}
          selected={selected}
          onOpenCamera={setCameraDroneId}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="label m-0">Every Drone</h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <LiveHeadcount airborne={airborneCount} grounded={groundedCount} />
            {scenarios ? (
              <SimLandAllButton
                airborne={airborneCount}
                onLandAll={() => {
                  for (const entry of vitals) {
                    if (entry.airborne) scenarios.setAltitude(entry.droneId, 0)
                  }
                }}
              />
            ) : null}
            <QuietModeToggle enabled={quietMode} onChange={setQuietMode} />
          </div>
          {Object.keys(book.students).length > 0 && (
            <button
              type="button"
              onClick={clearStudents}
              className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted hover:border-ink hover:text-ink"
            >
              Clear all assignments
            </button>
          )}
        </div>
        {/*
         * Fixed anatomy, and it has to be fixed across strips rather than within one.
         *
         * §1.1 of docs/DESIGN.md justifies this whole format on being "scannable by
         * position rather than by reading — the eye learns where charge is and stops
         * re-finding it". The row was a `flex flex-wrap`, so every cell was sized by its
         * own content and each strip found its own column positions. It looked aligned
         * only because every Drone was in the same phase: the moment one took off,
         * "On the ground" became "Level", ~70px narrower, and that row's charge and
         * response slid left — on exactly the strip something was happening to.
         *
         * The columns therefore live here, on the list, and each strip takes them by
         * subgrid. Freespace is the **response** column (`1fr`), not charge — charge
         * stays snug after height so the eye does not cross a cavern to find Response.
         * Below the breakpoint there is not room for five columns and the strip falls
         * back to wrapping, where alignment is not what a phone is doing anyway.
         */}
        <ul
          className={cn(
            'm-0 flex list-none flex-col gap-2 p-0',
            'min-[60rem]:grid min-[60rem]:grid-cols-[auto_auto_auto_auto_1fr]',
          )}
        >
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
              command={(droneId, kind) => issueCommand(droneId, kind, entry.callsign)}
              onReleaseStop={
                scenarios
                  ? () =>
                      releaseStop(entry.droneId, () =>
                        scenarios.resetEmergencyStop(entry.droneId),
                      )
                  : null
              }
              tracked={commandFor(entry.droneId)}
              exercise={lesson ? (currentExercise(lesson, now)?.exercise.name ?? null) : null}
              onOpenCamera={() => setCameraDroneId(entry.droneId)}
              hideStop={quietMode}
              softenAlerts={trainingWheels}
              hideStop={trainingWheels}
              onSpotlight={() => setSpotlightDroneId(entry.droneId)}
            />
          ))}
        </ul>
      </section>

      {cameraDrone && (
        <CameraSlide
          droneId={cameraDrone.id}
          droneName={cameraDrone.name}
          camera={cameraDrone.telemetry?.camera}
          scenarios={scenarios}
          onClose={() => setCameraDroneId(null)}
        />
      )}

      {overlay}
    </main>
  )
}

/**
 * Commands for the selected mark while the scope covers the strip list.
 *
 * Same Land / Hover / Stop as the strip — not a second command language. A Teacher who
 * picked a mark in full screen still has to act without exiting.
 */
function ScopeSelectedDock({
  vitals,
  student,
  command,
  onReleaseStop,
  tracked,
  onClear,
  onOpenCamera,
  hideStop = false,
  hideStop,
  onSpotlight,
}: {
  vitals: DroneVitals
  student: string | null
  command: (droneId: string, kind: CommandKind) => void
  onReleaseStop: (() => void) | null
  tracked: TrackedCommand | null
  onClear: () => void
  onOpenCamera: () => void
  /** Quiet mode — Stop is hidden on strips (local UI only). */
  hideStop?: boolean
  onSpotlight: () => void
}) {
  return (
    <div
      role="region"
      aria-label={`Controls for ${vitals.callsign}`}
      className="flex flex-col gap-3 rounded-surface border border-hairline bg-surface-1 p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="m-0 font-display text-body font-medium text-ink">{vitals.callsign}</h3>
          {student && <span className="text-value text-ink-subtle">{student}</span>}
          <span className="tnum text-value text-ink-subtle">{formatVerticalMovement(vitals)}</span>
          <span className="tnum text-value text-ink-subtle">
            {vitals.batteryFraction === null
              ? 'Charge not reported'
              : `${formatBattery(vitals.batteryFraction)} · ${formatBatteryTimeBudget(vitals.batteryFraction)}`}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenCamera}
            className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
          >
            Camera
          </button>
          <button
            type="button"
            onClick={onSpotlight}
            className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
          >
            Spotlight
          </button>
          <button
            type="button"
            onClick={onClear}
            className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted hover:border-ink hover:text-ink"
          >
            Clear
          </button>
        </div>
      </div>
      <CommandRow
        vitals={vitals}
        command={command}
        onReleaseStop={onReleaseStop}
        tracked={tracked}
        hideStop={hideStop}
      />
    </div>
  )
}

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

/**
 * One aircraft, one row.
 *
 * A strip is not a tile. A tile answers "what is this"; a strip answers "what is this
 * doing and how long have I got", which is why height carries its direction and charge
 * carries a time rather than only a percentage.
 */
function FlightStrip({
  vitals,
  student,
  selected,
  onSelect,
  isAcknowledged,
  acknowledgedAt,
  now,
  command,
  onReleaseStop,
  tracked,
  exercise,
  onOpenCamera,
  hideStop = false,
  softenAlerts,
  hideStop,
  onSpotlight,
}: {
  vitals: DroneVitals
  student: string | null
  selected: boolean
  onSelect: () => void
  isAcknowledged: (droneId: string, alert: VitalsAlert) => boolean
  acknowledgedAt: (droneId: string, alert: VitalsAlert) => number | null
  now: number
  command: (droneId: string, kind: CommandKind) => void
  /** Clear a latched stop on a simulated Fleet; null when release is not available here. */
  onReleaseStop: (() => void) | null
  tracked: TrackedCommand | null
  /** What it is meant to be doing. Shown beside what it is doing; nothing compares them. */
  exercise: string | null
  /** Opens the camera slide — watch only, not a Command (C9). */
  onOpenCamera: () => void
  /** Quiet mode — Stop is hidden on strips (local UI only). */
  hideStop?: boolean
  softenAlerts?: boolean
  /** Opens peer demo spotlight — watch only, not a Command (C9). */
  onSpotlight: () => void
}) {
  const separation = formatSeparation(vitals)
  const coordinates = formatCoordinates(vitals)

  return (
    <li
      id={`control-strip-${vitals.droneId}`}
      onClick={onSelect}
      className={cn(
        'flex flex-col gap-1.5 rounded-surface border-l-2 bg-surface-1 p-3',
        // The strip keeps its own box — rail, ground, selection outline — and takes the
        // list's columns rather than inventing its own.
        'min-[60rem]:col-span-full min-[60rem]:grid min-[60rem]:grid-cols-subgrid min-[60rem]:items-center min-[60rem]:gap-x-6 min-[60rem]:gap-y-1.5',
        vitals.alerts[0] && !softenAlerts
          ? SEVERITY_PRESENTATION[vitals.alerts[0].severity].className
          : 'border-hairline',
        // An outline rather than a fill: the tile's own severity colour has to keep
        // meaning what it means, and selection is a different kind of fact.
        selected && 'outline outline-2 outline-offset-2 outline-ink',
      )}
    >
      {/*
       * `contents` above the breakpoint: the five cells become items of the strip's
       * subgrid directly, so they land in the list's columns instead of in a box of
       * their own. Below it, the row wraps as before.
       */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 min-[60rem]:contents">
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
        {/*
         * The height, and no phase word beside it.
         *
         * The strip read "Level · 2.6 m", which is the same fact twice: a Drone holding
         * 2.6 m is what "Level" means. The height carries it, and carries the number the
         * word could not. The movement — arrow and rate — stays, because that is the answer
         * to "is it going up or down", which one height cannot give.
         */}
        <span className="tnum text-value text-ink-subtle">{formatVerticalMovement(vitals)}</span>
        <span className="tnum text-value text-ink-subtle">
          {vitals.batteryFraction === null
            ? 'Charge not reported'
            : `${formatBattery(vitals.batteryFraction)} · ${formatBatteryTimeBudget(vitals.batteryFraction)}`}
        </span>
        <span className="tnum ml-auto text-right text-value text-ink-muted min-[60rem]:ml-0">
          {vitals.responseAgeMs === null
            ? 'No response yet'
            : `Response ${formatAge(vitals.responseAgeMs)}`}
        </span>
      </div>

      {/*
       * Everything below the fixed top row spans the whole strip rather than a column.
       * The row above lays its five cells into the shared columns by subgrid; these lines —
       * Exercise, separation, Commands, Alerts — are full-width prose and controls, so
       * they take the whole width beneath it and keep their own vertical rhythm.
       */}
      <div className="flex flex-col gap-1.5 min-[60rem]:col-span-full">
        {/*
         * On its own line, never in the head row above.
         *
         * §4.4's whole argument is that the eye learns fixed positions. Threading three
         * numbers into the head row would push charge and response age sideways and break
         * the scan path every Teacher has already learned, for a value they read far less
         * often than either.
         */}
        {coordinates && <p className="m-0 tnum text-value text-ink-subtle">{coordinates}</p>}

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

        {/*
         * Camera is watch chrome beside the strip, not a Command. Kept out of CommandRow
         * so Land / Hover / Stop stay the only things that ask an aircraft to act (C9).
         */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onOpenCamera()
            }}
            className="min-h-11 cursor-pointer rounded-pill border border-dashed border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted hover:border-ink hover:text-ink"
          >
            Camera
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onSpotlight()
            }}
            className="min-h-11 cursor-pointer rounded-pill border border-dashed border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted hover:border-ink hover:text-ink"
          >
            Spotlight
          </button>
        </div>

        <CommandRow
          vitals={vitals}
          command={command}
          onReleaseStop={onReleaseStop}
          tracked={tracked}
          hideStop={hideStop}
        />

        {vitals.alerts.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {vitals.alerts.map((alert) => (
            <li key={alert.kind} className="flex flex-wrap items-baseline gap-2">
              <span
                className={cn(
                  'label rounded-pill border px-2 py-0.5',
                  softenAlerts
                    ? 'border-hairline text-ink-muted'
                    : SEVERITY_PRESENTATION[alert.severity].className,
                )}
              >
                {softenAlerts ? 'Note' : SEVERITY_PRESENTATION[alert.severity].label}
              </span>
              <span className="text-value text-ink">{alert.text}</span>
              {/*
                * Still here after it has been taken off the queue, and quieter. A Teacher
                * having seen a problem is not the same as the problem having stopped.
                */}
              {isAcknowledged(vitals.droneId, alert) && (
                <span className="tnum text-value text-ink-muted">
                  Acknowledged — {formatAge(Math.max(0, now - (acknowledgedAt(vitals.droneId, alert) ?? now)))}
                </span>
              )}
            </li>
          ))}
          </ul>
        )}
      </div>
    </li>
  )
}

/**
 * What a Teacher can ask of this aircraft.
 *
 * Land and Hover are always here because they are what gets reached for. Every Command in
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
  onReleaseStop,
  tracked,
  hideStop = false,
  hideStop,
}: {
  vitals: DroneVitals
  command: (droneId: string, kind: CommandKind) => void
  onReleaseStop: (() => void) | null
  tracked: TrackedCommand | null
  /** Quiet mode — hide Stop and Release stop (local UI only). */
  hideStop?: boolean
}) {
  const grounded = !vitals.airborne
  const stopHeld = vitals.phase === 'emergency'
  const showTracked = showCommandReceipt(tracked, stopHeld)

  return (
    <div className="flex flex-wrap items-center gap-2 min-[60rem]:flex-nowrap">
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
        Hover
      </button>
      {!hideStop &&
        (stopHeld ? (
          onReleaseStop ? (
            <button
              type="button"
              onClick={onReleaseStop}
              className="ml-auto min-h-11 cursor-pointer rounded-pill border border-status-fault bg-transparent px-4 py-1.5 text-value text-status-fault hover:border-ink hover:text-ink"
            >
              Release stop
            </button>
          ) : (
            <span className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled
                className="min-h-11 cursor-default rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted"
              >
                Release stop
              </button>
              <span className="text-value text-ink-muted">
                Stop is held — this Fleet cannot release it from here
              </span>
            </span>
          )
        ) : (
          <button
            type="button"
            onClick={() => command(vitals.droneId, 'emergency-stop')}
            className="ml-auto min-h-11 cursor-pointer rounded-pill border border-status-fault bg-transparent px-4 py-1.5 text-value text-status-fault hover:border-ink hover:text-ink"
          >
            Stop
          </button>
        ))}
          </span>
        )
      ) : hideStop ? (
        <span className="ml-auto text-value text-ink-muted">Stop hidden — training wheels</span>
      ) : (
        <button
          type="button"
          onClick={() => command(vitals.droneId, 'emergency-stop')}
          className="ml-auto min-h-11 cursor-pointer rounded-pill border border-status-fault bg-transparent px-4 py-1.5 text-value text-status-fault hover:border-ink hover:text-ink"
        >
          Stop
        </button>
      )}
      {showTracked && (
        <span className="text-value text-ink-muted">{describeCommand(tracked)}</span>
      )}
    </div>
  )
}

/**
 * Emergency stop already has lasting signals: Release stop (or the held reason) and the
 * critical alert. "Stop — done" next to those reads as a stuck second control — the owner
 * asked it gone. Land/Hover still get the C4 receipt line.
 */
function showCommandReceipt(
  tracked: TrackedCommand | null,
  stopHeld: boolean,
): tracked is TrackedCommand {
  if (tracked == null) return false
  if (tracked.command.kind !== 'emergency-stop') return true
  if (stopHeld || tracked.stage === 'done') return false
  return true
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
  hold: 'Hover',
  'auto-land': 'Auto-land',
  'emergency-stop': 'Stop',
}
