'use client'

import { useMemo, useState, useSyncExternalStore, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  assignStudent,
  assignNextRosterName,
  clearStudents,
  firstUnassignedDrone,
  nextRosterNameForAssign,
  studentOf,
  swapStudentAssignments,
  currentExercise,
  readLogbook,
  recordCommand,
  readServerLogbook,
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
import { cn } from '@/lib/utils'
import { recordGhostPaths, type GhostPathStore } from '@/lib/scope-ghost-paths'
import { AirborneTracker } from '@/lib/longest-airborne'
import { recordStopOnLesson } from '@/lib/stop-audit'
import {
  emptyCeilingBreachState,
  observeCeilingBreaches,
  writeLessonCeilingBreachCount,
  type CeilingBreachState,
} from '@/lib/ceiling-breach-count'
import {
  commandLockState,
  lockedCommandLabel,
  readScreenLocked,
  writeScreenLocked,
} from '@/lib/screen-lock'
import { AttentionBar } from './AttentionBar'
import { AltitudeFloorNotice } from './AltitudeFloorNotice'
import { BatteryChargeReading } from './BatteryChargeReading'
import { CameraRecordAllButton } from './CameraRecordAllButton'
import { CameraSlide } from './CameraSlide'
import { ExerciseRemaining } from './ExerciseRemaining'
import { FleetAllWellLine } from './FleetAllWellLine'
import { HeightCeilingBanner } from './HeightCeilingBanner'
import { HoverAllButton } from './HoverAllButton'
import { LandAllButton } from './LandAllButton'
import { LandTableButton } from './LandTableButton'
import { LessonStrip } from './LessonStrip'
import { LongestAirborne } from './LongestAirborne'
import { NotYetAirborneNotice } from './NotYetAirborneNotice'
import { AssignNextButton } from './AssignNextButton'
import { LiveHeadcount } from './LiveHeadcount'
import { SpareInventory } from './SpareInventory'
import { ScreenLockToggle } from './ScreenLockToggle'
import { SimLandAllButton } from './SimLandAllButton'
import { StopAllButton } from './StopAllButton'
import { QuietModeToggle } from './QuietModeToggle'
import { PresenceBadge } from './PresenceBadge'
import { Scope } from './Scope'
import { MaintenanceFlag } from './MaintenanceFlag'
import { ControlDisclosure } from './ControlDisclosure'
import { TrainingWheelsBanner, TrainingWheelsToggle } from './TrainingWheelsBanner'
import { useFleet } from './FleetProvider'
import { useTrainingWheelsOptional } from '@/lib/training-wheels'
import { INSTRUMENT_FRAME } from '@/lib/frame'

/**
 * The Flight Control Center: calm while the Mission runs.
 *
 * Order is fixed and short: what needs you (one Alert), where everything is (Scope),
 * three fleet actions, then compact strips. Per-Drone Commands and dense Telemetry stay
 * behind selection so a Teacher glancing up for two seconds is not hunting past chrome.
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
  const [quietMode, setQuietMode] = useState(false)
  const [screenLocked, setScreenLocked] = useState(false)
  const airborneTracker = useRef(new AirborneTracker())
  const ceilingRef = useRef<CeilingBreachState>(emptyCeilingBreachState())
  const ceilingLessonId = useRef<string | null>(null)

  const lesson = runningLesson(book)
  const state = snapshot.state
  const queue = useMemo(() => alertQueue(vitals, isAcknowledged), [vitals, isAcknowledged])

  // Observe takeoff clocks without setState — vitals is a fresh array each Fleet tick,
  // and a tick+setState loop hung Control under jsdom.
  const longestAirborneCraft = useMemo(() => {
    airborneTracker.current.observe(
      vitals.map((entry) => ({ droneId: entry.droneId, airborne: entry.airborne })),
      now,
    )
    return vitals.map((entry) => ({
      droneId: entry.droneId,
      callsign: entry.callsign,
      airborne: entry.airborne,
      airborneSince: airborneTracker.current.sinceOf(entry.droneId),
    }))
  }, [vitals, now])

  useEffect(() => {
    setScreenLocked(readScreenLocked())
  }, [])

  useEffect(() => {
    if (!state) return
    setGhostPaths((current) => recordGhostPaths(current, state.drones, now))
  }, [state, now])

  useEffect(() => {
    if (!lesson) {
      ceilingRef.current = emptyCeilingBreachState()
      ceilingLessonId.current = null
      return
    }
    if (ceilingLessonId.current !== lesson.id) {
      ceilingRef.current = emptyCeilingBreachState()
      ceilingLessonId.current = lesson.id
    }
    const next = observeCeilingBreaches(
      ceilingRef.current,
      vitals.map((entry) => ({ droneId: entry.droneId, altitudeM: entry.altitudeM })),
    )
    ceilingRef.current = next
    writeLessonCeilingBreachCount(lesson.id, next.count)
  }, [lesson, vitals])

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
  const boardDroneIds = state.drones.map((drone) => drone.id)
  const nextRosterName = nextRosterNameForAssign(book)
  const assignTargetDroneId =
    selected !== null && studentOf(book, selected) === null
      ? selected
      : firstUnassignedDrone(book, boardDroneIds)

  const issueCommand = (droneId: string, kind: CommandKind, callsign: string) => {
    if (screenLocked) return
    command(droneId, kind)
    /*
     * Noted against the Lesson as it is sent (C7), not when it resolves.
     * Stop presses use recordStopOnLesson so they are not double-written (#203).
     */
    if (!lesson) return
    if (kind === 'emergency-stop') {
      recordStopOnLesson(lesson.id, { at: now, droneId, droneName: callsign })
      return
    }
    recordCommand(lesson.id, {
      at: now,
      droneId,
      droneName: callsign,
      kind,
    })
  }

  const releaseStop = (_droneId: string, reset: () => void) => {
    reset()
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

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <FleetAllWellLine drones={state.drones} />
        <LiveHeadcount airborne={airborneCount} grounded={groundedCount} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <TrainingWheelsBanner />
        <ScreenLockToggle
          locked={screenLocked}
          onChange={(locked) => {
            setScreenLocked(locked)
            writeScreenLocked(locked)
          }}
        />
      </div>

      {/*
       * Mission-run rail hashes. Clearance and confirm mount elsewhere over time; until
       * then these anchors land on the Attention / Scope regions a Teacher already uses.
       */}
      <span id="mission-clearance" className="scroll-mt-24 block h-0 w-0 overflow-hidden" />
      <div id="mission-alerts" className="scroll-mt-24 flex flex-col gap-3">
        <AttentionBar
          queue={queue}
          studentFor={(droneId) => studentOf(book, droneId)}
          onAcknowledge={(entry) => acknowledge(entry.droneId, entry)}
          onResponse={(entry, response) => {
            if (response.command !== null) {
              issueCommand(entry.droneId, response.command, entry.callsign)
            }
            acknowledge(entry.droneId, entry)
          }}
        />
      </div>
      <HeightCeilingBanner vitals={vitals} />
      <AltitudeFloorNotice vitals={vitals} />
      <ControlDisclosure summary="Also noting">
        <div className="flex flex-col gap-3">
          <NotYetAirborneNotice
            lessonStarted={lesson !== null}
            craft={vitals.map((entry) => ({
              droneId: entry.droneId,
              callsign: entry.callsign,
              airborne: entry.airborne,
              studentName: studentOf(book, entry.droneId),
            }))}
          />
          <LongestAirborne now={now} craft={longestAirborneCraft} />
        </div>
      </ControlDisclosure>

      <span id="mission-telemetry" className="scroll-mt-24 block h-0 w-0 overflow-hidden" />
      <span id="mission-commands" className="scroll-mt-24 block h-0 w-0 overflow-hidden" />
      <span id="mission-complete" className="scroll-mt-24 block h-0 w-0 overflow-hidden" />
      <section id="mission-map" className="scroll-mt-24 flex flex-col gap-3">
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
                hideStop={quietMode || trainingWheels}
                commandsLocked={screenLocked}
              />
            ) : null
          }
        />
      </section>

      {airborneCount > 0 && (
        <section
          className="flex flex-wrap items-center gap-3"
          aria-label="Fleet actions"
        >
          <LandAllButton
            fleet={vitals.map((entry) => ({
              droneId: entry.droneId,
              airborne: entry.airborne,
            }))}
            onLand={(droneId) => {
              const entry = vitals.find((v) => v.droneId === droneId)
              if (entry) issueCommand(droneId, 'land', entry.callsign)
            }}
          />
          <HoverAllButton
            fleet={vitals.map((entry) => ({
              droneId: entry.droneId,
              airborne: entry.airborne,
            }))}
            onHover={(droneId) => {
              const entry = vitals.find((v) => v.droneId === droneId)
              if (entry) issueCommand(droneId, 'hold', entry.callsign)
            }}
          />
          {!(quietMode || trainingWheels) ? (
            <StopAllButton
              fleet={vitals.map((entry) => ({
                droneId: entry.droneId,
                airborne: entry.airborne,
              }))}
              onStop={(droneId) => {
                const entry = vitals.find((v) => v.droneId === droneId)
                if (entry) issueCommand(droneId, 'emergency-stop', entry.callsign)
              }}
            />
          ) : null}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="label m-0">Every Drone</h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <AssignNextButton
              nextName={nextRosterName}
              targetDroneId={assignTargetDroneId}
              onAssign={() => {
                if (assignTargetDroneId) assignNextRosterName(assignTargetDroneId)
              }}
            />
          </div>
        </div>
        <ControlDisclosure summary="More actions">
          <div className="flex flex-wrap items-center gap-3">
            <CameraRecordAllButton droneIds={vitals.map((entry) => entry.droneId)} />
            <SpareInventory grounded={groundedCount} total={vitals.length} />
            {tableGroups(state.drones, vitals).map((group) => (
              <LandTableButton
                key={group.label}
                tableLabel={group.label}
                members={group.members}
                onLand={(droneIds) => {
                  for (const droneId of droneIds) {
                    const entry = vitals.find((v) => v.droneId === droneId)
                    if (entry) issueCommand(droneId, 'land', entry.callsign)
                  }
                }}
              />
            ))}
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
            <TrainingWheelsToggle />
            {Object.keys(book.students).length > 0 && (
              <button
                type="button"
                onClick={clearStudents}
                className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted hover:border-ink hover:text-ink"
              >
                Clear assignments
              </button>
            )}
          </div>
        </ControlDisclosure>
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
              swapTargetId={selected}
              onSwap={
                selected !== null && selected !== entry.droneId
                  ? () => swapStudentAssignments(selected, entry.droneId)
                  : null
              }
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
              hideStop={quietMode || trainingWheels}
              softenAlerts={trainingWheels}
              lesson={lesson}
              commandsLocked={screenLocked}
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

    </main>
  )
}

/**
 * Commands for the selected mark while the scope covers the strip list.
 *
 * Same Land / Hover / Recall / Stop as the strip — not a second command language. A Teacher
 * who picked a mark in full screen still has to act without exiting.
 */
function tableGroups(
  drones: readonly { readonly id: string; readonly telemetry?: { readonly linkGroupId?: string | null } | null }[],
  vitals: readonly DroneVitals[],
): readonly { label: string; members: readonly { droneId: string; airborne: boolean }[] }[] {
  const groups = new Map<string, { droneId: string; airborne: boolean }[]>()
  for (const drone of drones) {
    const groupId = drone.telemetry?.linkGroupId
    if (groupId == null || groupId === '') continue
    const entry = vitals.find((v) => v.droneId === drone.id)
    const list = groups.get(groupId) ?? []
    list.push({ droneId: drone.id, airborne: entry?.airborne ?? false })
    groups.set(groupId, list)
  }
  return [...groups.entries()].map(([id, members]) => ({
    label: id.startsWith('group-') ? `Table ${id.slice('group-'.length).toUpperCase()}` : id,
    members,
  }))
}

function ScopeSelectedDock({
  vitals,
  student,
  command,
  onReleaseStop,
  tracked,
  onClear,
  onOpenCamera,
  hideStop = false,
  commandsLocked = false,
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
  commandsLocked?: boolean
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
          {student && <span className="font-display text-body font-medium text-ink">{student}</span>}
          <span className="tnum text-value text-ink-subtle">{formatVerticalMovement(vitals)}</span>
          <BatteryChargeReading fraction={vitals.batteryFraction} />
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
        commandsLocked={commandsLocked}
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
  const [editing, setEditing] = useState(false)
  const value = draft ?? student ?? ''

  if (student && !editing) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setEditing(true)
        }}
        className="min-h-11 cursor-pointer border-0 bg-transparent p-0 font-display text-body font-medium text-ink hover:underline"
      >
        <span className="visually-hidden">Who is flying {droneName}: </span>
        {student}
      </button>
    )
  }

  return (
    <label className="flex items-center">
      <span className="visually-hidden">Who is flying {droneName}</span>
      <input
        value={value}
        placeholder="Add a name"
        autoFocus={editing}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft !== null) assignStudent(droneId, draft)
          setDraft(null)
          setEditing(false)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') {
            setDraft(null)
            setEditing(false)
            event.currentTarget.blur()
          }
        }}
        onClick={(event) => event.stopPropagation()}
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
  swapTargetId,
  onSwap,
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
  lesson,
  commandsLocked = false,
}: {
  vitals: DroneVitals
  student: string | null
  selected: boolean
  onSelect: () => void
  /** When set and different from this strip, Swap is offered against this Drone. */
  swapTargetId: string | null
  onSwap: (() => void) | null
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
  lesson: ReturnType<typeof runningLesson>
  commandsLocked?: boolean
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
        {vitals.status === 'Offline' && <PresenceBadge kind="offline" />}
        <MaintenanceFlag active={false} />
        <StudentField droneId={vitals.droneId} droneName={vitals.callsign} student={student} />
        {onSwap && swapTargetId !== null && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onSwap()
            }}
            className="min-h-11 cursor-pointer rounded-pill border border-dashed border-hairline bg-transparent px-3 py-1.5 text-value text-ink-muted hover:border-ink hover:text-ink"
          >
            Swap
          </button>
        )}
        {/*
         * The height, and no phase word beside it.
         *
         * The strip read "Level · 2.6 m", which is the same fact twice: a Drone holding
         * 2.6 m is what "Level" means. The height carries it, and carries the number the
         * word could not. The movement — arrow and rate — stays, because that is the answer
         * to "is it going up or down", which one height cannot give.
         */}
        <span className="tnum text-value text-ink-subtle">{formatVerticalMovement(vitals)}</span>
        <BatteryChargeReading fraction={vitals.batteryFraction} />
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
        <ExerciseRemaining lesson={lesson} now={now} />

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
         * so Land / Hover / Recall / Stop stay the only things that ask an aircraft to act (C9).
         * Record lives inside the Camera dialog (CameraPane) — not a sibling of Camera here.
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
        </div>

        <CommandRow
          vitals={vitals}
          command={command}
          onReleaseStop={onReleaseStop}
          tracked={tracked}
          hideStop={hideStop}
          commandsLocked={commandsLocked}
        />

        {vitals.alerts.length > 0 && (
          <details
            className="rounded-surface border border-hairline bg-canvas open:pb-2 [&[open]>summary>span:first-child]:rotate-90"
            onClick={(event) => event.stopPropagation()}
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-1.5 text-value text-ink marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="text-ink-muted" aria-hidden="true">
                ▸
              </span>
              <span
                className={cn(
                  'label rounded-pill border px-2 py-0.5',
                  softenAlerts
                    ? 'border-hairline text-ink-muted'
                    : SEVERITY_PRESENTATION[vitals.alerts[0]!.severity].className,
                )}
              >
                {softenAlerts
                  ? 'Note'
                  : SEVERITY_PRESENTATION[vitals.alerts[0]!.severity].label}
              </span>
              <span className="font-medium">
                {vitals.alerts.length === 1 ? '1 alert' : `${vitals.alerts.length} alerts`}
              </span>
              <span className="min-w-0 truncate text-ink-subtle">{vitals.alerts[0]!.text}</span>
            </summary>
            <ul className="m-0 flex list-none flex-col gap-1 border-t border-hairline px-3 pt-2">
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
                      Acknowledged —{' '}
                      {formatAge(
                        Math.max(0, now - (acknowledgedAt(vitals.droneId, alert) ?? now)),
                      )}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </li>
  )
}

/**
 * What a Teacher can ask of this aircraft.
 *
 * Land, Hover and Recall are always here because they are what gets reached for. Every
 * Command in this row takes energy out of the Drone; there is nothing here that makes one
 * do more than it is already doing, which is what makes a mistaken press survivable.
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
  commandsLocked = false,
}: {
  vitals: DroneVitals
  command: (droneId: string, kind: CommandKind) => void
  onReleaseStop: (() => void) | null
  tracked: TrackedCommand | null
  /** Quiet mode — hide Stop and Release stop (local UI only). */
  hideStop?: boolean
  commandsLocked?: boolean
}) {
  const grounded = !vitals.airborne
  const stopHeld = vitals.phase === 'emergency'
  const showTracked = showCommandReceipt(tracked, stopHeld)
  const lock = commandLockState(commandsLocked)
  const commandsDisabled = grounded || lock.disabled

  return (
    <div className="flex flex-wrap items-center gap-2 min-[60rem]:flex-nowrap">
      <button
        type="button"
        disabled={commandsDisabled}
        aria-label={lockedCommandLabel('Land', commandsLocked)}
        onClick={() => command(vitals.droneId, 'land')}
        className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink disabled:cursor-default disabled:text-ink-muted"
      >
        Land
      </button>
      <button
        type="button"
        disabled={commandsDisabled}
        aria-label={lockedCommandLabel('Hover', commandsLocked)}
        onClick={() => command(vitals.droneId, 'hold')}
        className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink disabled:cursor-default disabled:text-ink-muted"
      >
        Hover
      </button>
      <button
        type="button"
        disabled={commandsDisabled}
        aria-label={lockedCommandLabel('Recall', commandsLocked)}
        onClick={() => command(vitals.droneId, 'return-home')}
        className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink disabled:cursor-default disabled:text-ink-muted"
      >
        Recall
      </button>
      {!hideStop ? (
        stopHeld ? (
          onReleaseStop ? (
            <button
              type="button"
              disabled={lock.disabled}
              aria-label={lockedCommandLabel('Release stop', commandsLocked)}
              onClick={onReleaseStop}
              className="ml-auto min-h-11 cursor-pointer rounded-pill border border-status-fault bg-transparent px-4 py-1.5 text-value text-status-fault hover:border-ink hover:text-ink disabled:cursor-default disabled:text-ink-muted"
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
            disabled={lock.disabled}
            aria-label={lockedCommandLabel('Stop', commandsLocked)}
            onClick={() => command(vitals.droneId, 'emergency-stop')}
            className="ml-auto min-h-11 cursor-pointer rounded-pill border border-status-fault bg-transparent px-4 py-1.5 text-value text-status-fault hover:border-ink hover:text-ink disabled:cursor-default disabled:text-ink-muted"
          >
            Stop
          </button>
        )
      ) : (
        <span className="ml-auto text-value text-ink-muted">Stop hidden — training wheels</span>
      )}
      {lock.reason && (
        <span className="text-value text-ink-muted">{lock.reason}</span>
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
  'return-home': 'Recall',
}
