'use client'

import { useMemo, useState, useSyncExternalStore, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  assignStudent,
  assignNextRosterName,
  clearStudents,
  firstUnassignedDrone,
  nextRosterNameForAssign,
  studentIdOf,
  studentOf,
  swapStudentAssignments,
  currentExercise,
  readLogbook,
  putMissionOnLesson,
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
import { AttentionBar } from './AttentionBar'
import { BatteryOnChargeTick } from './BatteryOnChargeTick'
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
import { SimLandAllButton } from './SimLandAllButton'
import { StopAllButton } from './StopAllButton'
import { PresenceBadge } from './PresenceBadge'
import { Scope } from './Scope'
import { MaintenanceFlag } from './MaintenanceFlag'
import { ControlDisclosure } from './ControlDisclosure'
import { ClearanceQueue, type ClearanceQueueCraft } from './ClearanceQueue'
import { ConfirmMissionComplete } from './ConfirmMissionComplete'
import { CraftReturnedTick } from './CraftReturnedTick'
import { PackdownChecklist } from './PackdownChecklist'
import { TeacherAtcToolbar } from './TeacherAtcToolbar'
import { ClassroomCodePanel } from './ClassroomCodePanel'
import { ScenarioWatchList } from './ScenarioWatchList'
import { useFleet } from './FleetProvider'
import { INSTRUMENT_FRAME } from '@/lib/frame'
import { readClearances, writeClearances } from '@/lib/clearance-store'
import {
  grantSeatsForDrone,
  holdSeatsForDrone,
  pushClassroomInstruction,
  readClassroomSession,
} from '@/lib/classroom-session'
import type { ClearanceState } from '@/lib/clearance'
import { emptyClearanceState } from '@/lib/clearance'
import { putMission, readMission, startMission } from '@/lib/mission-draft'
import { missionCraftIds } from '@/lib/mission-flow-facts'
import type { Mission } from '@/lib/mission'
import { scenarioOrUnknown } from '@/lib/mission-scenarios'
import { readPreFlightSeven, propellersTicked } from '@/lib/preflight-seven'
import { readTeams, teamForStudent } from '@/lib/teams'
import type { MissionWithInstructions } from './AssignTargetControl'
import { AssignTargetControl } from './AssignTargetControl'
import { InstructionControls } from './InstructionControls'
import type { LocalPosition } from '@techtechflight/contract'

/**
 * The Flight Control Center: calm while the Mission runs. Steps 6 to 11 of the Mission run.
 *
 * One live board: Attention, clearances, Scope, ATC toolbar, strips, seal and pack-down.
 * The rail marks which of steps 6 to 11 a Teacher is on and brings that section into view,
 * and it does **not** hide the other five. The prototype says so itself against step 7, and
 * the safety reason is the stronger one: Land, Hover, Recall and Stop live on the strips,
 * and a Command that a navigation press can hide is a Command a Teacher cannot reach in the
 * ten seconds they have. Only close-down and the debrief are surfaces of their own.
 */
export function ControlScreen({
  bare = false,
  step,
}: {
  /** Mounted inside another screen's `main`, so it renders neither one nor a frame. */
  readonly bare?: boolean
  /** Which of steps 6 to 11 to settle the board on. Nothing scrolls when it is not said. */
  readonly step?: number
} = {}) {
  const { snapshot, vitals, acknowledge, isAcknowledged, acknowledgedAt, now, command, commandFor, scenarios } =
    useFleet()
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)

  // Which Drone the Teacher is looking at. Choosing a mark on the scope lights its strip
  // and the reverse, because "which one is that" is the question the scope exists for.
  const [selected, setSelected] = useState<string | null>(null)
  // Camera slide is watch-only chrome — not a Command (C9). Settings still owns the map.
  const [cameraDroneId, setCameraDroneId] = useState<string | null>(null)
  const [ghostPaths, setGhostPaths] = useState<GhostPathStore>(() => new Map())
  // The Mission and its clearances are read on mount, not in an initialiser: the server
  // render has no localStorage and must not disagree with the first client paint.
  const [mission, setMission] = useState<Mission | null>(null)
  const [clearances, setClearances] = useState<ClearanceState>(() => emptyClearanceState())
  const [pickedTarget, setPickedTarget] = useState<LocalPosition | null>(null)
  const clearanceRef = useRef<HTMLElement | null>(null)
  const scopeRef = useRef<HTMLElement | null>(null)
  const targetRef = useRef<HTMLElement | null>(null)
  const attentionRef = useRef<HTMLElement | null>(null)
  const commandsRef = useRef<HTMLElement | null>(null)
  const stripsRef = useRef<HTMLElement | null>(null)
  const sealRef = useRef<HTMLElement | null>(null)
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
    if (!state) return
    setGhostPaths((current) => recordGhostPaths(current, state.drones, now))
  }, [state, now])

  /*
   * The rail keeps the Teacher's place on a board that stays whole. Changing step brings
   * the section for that step into view; nothing is unmounted, so a Command is never more
   * than a scroll away.
   */
  useEffect(() => {
    if (step === undefined) return
    const sections: Readonly<Record<number, typeof clearanceRef>> = {
      6: clearanceRef,
      7: scopeRef,
      8: stripsRef,
      9: commandsRef,
      10: attentionRef,
      11: sealRef,
    }
    const target = sections[step]?.current
    // jsdom has no layout, and no `scrollIntoView` on an element to call either.
    if (typeof target?.scrollIntoView === 'function') {
      target.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
  }, [step])

  const lessonId = lesson?.id ?? null
  useEffect(() => {
    /*
     * Arriving here with a Mission is what "under way" means. The clearance queue fills
     * itself from eligibility (ADR-0021) and eligibility requires an active Mission, so
     * waiting for the first grant to start it would leave the queue permanently empty.
     * Nothing about this reaches an aircraft.
     */
    const found = readMission(lessonId)
    setMission(
      found !== null && lessonId !== null && found.startedAt === null
        ? (startMission(lessonId, Date.now()) ?? found)
        : found,
    )
    setClearances(readClearances(lessonId))
  }, [lessonId])

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

  const selectedVitals = selected ? (vitals.find((entry) => entry.droneId === selected) ?? null) : null

  // New-target picker: use the selected craft's present position when the Teacher has
  // not tapped a different point yet (Scope tap wiring can replace this later).
  useEffect(() => {
    if (selectedVitals === null || !state) {
      setPickedTarget(null)
      return
    }
    const drone = state.drones.find((row) => row.id === selectedVitals.droneId)
    const position = drone?.telemetry?.position
    if (position) {
      setPickedTarget({ eastM: position.eastM, northM: position.northM })
    }
  }, [selectedVitals, state])

  if (!state) {
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

  // Board order only — same muscle memory as the Fleet tiles. Urgency lives on the
  // Attention bar (`alertQueue`); reshuffling strips when alerts appear or clear is what
  // made this list dizzying. `FleetState.drones` (and thus `vitals`) are already that order.
  const strips = vitals
  const airborneCount = vitals.filter((entry) => entry.airborne).length
  const groundedCount = vitals.length - airborneCount
  const cameraDrone =
    cameraDroneId === null
      ? null
      : (state.drones.find((drone) => drone.id === cameraDroneId) ?? null)
  const boardDroneIds = state.drones.map((drone) => drone.id)
  const nextRosterName = nextRosterNameForAssign(book)

  const teams = readTeams()
  const preFlight = readPreFlightSeven(lessonId)
  const missionCraft = missionCraftIds(teams, mission)

  const clearanceCraft: readonly ClearanceQueueCraft[] = state.drones
    .filter((drone) => missionCraft.includes(drone.id))
    .map((drone) => {
      const studentId = studentIdOf(book, drone.id)
      return {
        input: {
          droneId: drone.id,
          status: drone.status,
          studentId,
          // The Teacher's own tick is the part of pre-flight the board cannot see, and
          // it is the part that says a human looked at the airframe.
          preFlightDone: propellersTicked(preFlight, drone.id),
          mission,
        },
        droneName: drone.name,
        teamName: studentId === null ? null : (teamForStudent(teams, studentId)?.name ?? null),
        studentName: studentOf(book, drone.id),
      }
    })

  // Board order, both fields, from the Fleet State this screen already has.
  const packdownCrafts = state.drones.map((drone) => ({
    droneId: drone.id,
    droneName: drone.name,
  }))

  const missionCraftStatus = state.drones
    .filter((drone) => missionCraft.includes(drone.id))
    .map((drone) => ({
      droneId: drone.id,
      droneName: drone.name,
      airborne: vitals.find((entry) => entry.droneId === drone.id)?.airborne === true,
    }))
  const assignTargetDroneId =
    selected !== null && studentOf(book, selected) === null
      ? selected
      : firstUnassignedDrone(book, boardDroneIds)

  const issueCommand = (droneId: string, kind: CommandKind, callsign: string) => {
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

  const selectedCraftOption =
    selectedVitals === null
      ? null
      : {
          droneId: selectedVitals.droneId,
          droneName: selectedVitals.callsign,
          teamId: (() => {
            const sid = studentIdOf(book, selectedVitals.droneId)
            return sid === null ? null : (teamForStudent(teams, sid)?.id ?? null)
          })(),
          teamName: (() => {
            const sid = studentIdOf(book, selectedVitals.droneId)
            return sid === null ? null : (teamForStudent(teams, sid)?.name ?? null)
          })(),
        }

  const assignTargetTeams = teams
    .map((team) => {
      const droneId = team.droneId
      if (droneId === null) return null
      return { teamId: team.id, teamName: team.name, droneId }
    })
    .filter((row): row is { teamId: string; teamName: string; droneId: string } => row !== null)

  const persistMission = (next: MissionWithInstructions) => {
    setMission(putMission(lessonId, next as Mission))
    const session = readClassroomSession()
    if (session === null) return
    const previous: readonly { readonly id: string }[] =
      mission !== null && Array.isArray((mission as MissionWithInstructions).instructions)
        ? ((mission as MissionWithInstructions).instructions ?? [])
        : []
    const added = (next.instructions ?? []).filter(
      (row) => !previous.some((before) => before.id === row.id),
    )
    let carried = session
    for (const row of added) {
      carried = pushClassroomInstruction(carried, row.detail, 'info')
    }
  }

  const board = (
    <>
      {lesson && (
        <LessonStrip lesson={lesson} events={snapshot.history?.events ?? []} now={now} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <FleetAllWellLine drones={state.drones} />
        <LiveHeadcount airborne={airborneCount} grounded={groundedCount} />
      </div>

      {lesson ? <ClassroomCodePanel /> : null}

      {mission !== null ? <ScenarioWatchList scenarioId={mission.scenarioId} /> : null}

      <section ref={attentionRef} className="scroll-mt-4" aria-label="Attention">
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
      </section>

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

      {mission !== null ? (
        <section ref={clearanceRef} className="flex flex-col gap-3 scroll-mt-4">
          <ClearanceQueue
            state={clearances}
            craft={clearanceCraft}
            grantedBy="Teacher"
            now={now}
            onStateChange={(next) => {
              setClearances(writeClearances(lessonId, next))
              const session = readClassroomSession()
              if (session === null) return
              const grantedNow = next.records.filter(
                (record) =>
                  record.grantedAt !== null &&
                  !clearances.records.some(
                    (before) =>
                      before.droneId === record.droneId && before.grantedAt !== null,
                  ),
              )
              /*
               * A hold has to reach the tablet the same way a grant does. Without this the
               * Teacher's answer never leaves this board, and a Student who asked sits on
               * "Waiting for your Teacher" while the Teacher believes they have been told.
               */
              const heldNow = next.records.filter(
                (record) =>
                  record.grantedAt === null &&
                  record.heldAt !== null &&
                  !clearances.records.some(
                    (before) => before.droneId === record.droneId && before.heldAt !== null,
                  ),
              )
              let carried = session
              for (const record of grantedNow) {
                carried = grantSeatsForDrone(carried, record.droneId)
              }
              for (const record of heldNow) {
                carried = holdSeatsForDrone(carried, record.droneId)
              }
            }}
          />
        </section>
      ) : null}

      <section ref={commandsRef} className="scroll-mt-4">
        <TeacherAtcToolbar
          mission={mission}
          selectedCraft={selectedCraftOption}
          airborneCount={airborneCount}
          givenBy="Teacher"
          onCommandFleet={(kind) => {
            for (const entry of vitals) {
              if (entry.airborne) issueCommand(entry.droneId, kind, entry.callsign)
            }
          }}
          onMissionChange={persistMission}
          onFocusClearance={() => clearanceRef.current?.scrollIntoView({ behavior: 'smooth' })}
          onFocusScope={() => scopeRef.current?.scrollIntoView({ behavior: 'smooth' })}
          onFocusNewTarget={() => targetRef.current?.scrollIntoView({ behavior: 'smooth' })}
        />
      </section>

      <section ref={scopeRef} className="flex flex-col gap-3 scroll-mt-4">
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
              />
            ) : null
          }
        />
        <p className="m-0 text-value text-ink-muted">
          Draw or change No-fly Zones on Lesson under Mission area. Scope shows them live.
        </p>
      </section>

      {airborneCount > 0 && (
        <section className="flex flex-wrap items-center gap-3" aria-label="Fleet actions">
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
        </section>
      )}

      {mission !== null && selectedCraftOption !== null ? (
        <section ref={targetRef} className="flex flex-col gap-3 scroll-mt-4">
          <h2 className="label m-0">Instructions for the selected craft</h2>
          <InstructionControls
            mission={mission}
            craft={selectedCraftOption}
            givenBy="Teacher"
            onRecorded={persistMission}
          />
          {assignTargetTeams.length > 0 ? (
            <AssignTargetControl
              mission={mission}
              teams={assignTargetTeams}
              pickedPosition={pickedTarget}
              givenBy="Teacher"
              onRecorded={(next) => {
                persistMission(next)
                setPickedTarget(null)
              }}
            />
          ) : null}
        </section>
      ) : null}

      <section ref={stripsRef} className="flex scroll-mt-4 flex-col gap-3">
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
              onSelect={() =>
                setSelected((current) => (current === entry.droneId ? null : entry.droneId))
              }
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
              lesson={lesson}
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
    </>
  )

  const closeDown = (
    <>
      {mission !== null && mission.startedAt !== null ? (
        <section ref={sealRef} className="flex scroll-mt-4 flex-col gap-3 border-t border-hairline pt-5">
          <h2 className="label m-0">Mission complete</h2>
          <ConfirmMissionComplete
            mission={mission}
            craft={missionCraftStatus}
            judges={scenarioOrUnknown(mission.scenarioId).judges}
            evidence={{
              hadCollision: null,
              noFlyViolations: null,
              routeCoverageKnown: null,
            }}
            onConfirmed={(sealed) => {
              setMission(putMission(lessonId, sealed))
              if (lessonId !== null) putMissionOnLesson(lessonId, sealed)
            }}
          />
        </section>
      ) : null}

      {lesson !== null ? (
        <section className="flex flex-col gap-4 border-t border-hairline pt-5">
          <PackdownChecklist lessonId={lesson.id} crafts={packdownCrafts} />
          <BatteryOnChargeTick lessonId={lesson.id} packs={packdownCrafts} />
          <CraftReturnedTick lessonId={lesson.id} crafts={packdownCrafts} />
        </section>
      ) : null}
    </>
  )

  /*
   * Step 11 is the close-down and only that. It is the one step where hiding the strips is
   * safe rather than reckless, because it does not open until every craft is down: there is
   * no Command left to send. Steps 6 to 10 keep the whole board and this under it.
   */
  if (bare && step === 11) {
    return <div className="flex flex-col gap-6">{closeDown}</div>
  }

  if (bare) {
    return (
      <div className="flex flex-col gap-6">
        {board}
        {closeDown}
      </div>
    )
  }

  return (
    <main
      id="content"
      tabIndex={-1}
      className={cn(INSTRUMENT_FRAME, 'flex flex-col gap-6 p-4 min-[26rem]:p-8')}
    >
      {board}
      {closeDown}
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
}: {
  vitals: DroneVitals
  student: string | null
  command: (droneId: string, kind: CommandKind) => void
  onReleaseStop: (() => void) | null
  tracked: TrackedCommand | null
  onClear: () => void
  onOpenCamera: () => void
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
  lesson,
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
  lesson: ReturnType<typeof runningLesson>
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
        vitals.alerts[0]
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
         * The strip read "Level, 2.6 m", which is the same fact twice: a Drone holding
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
                  SEVERITY_PRESENTATION[vitals.alerts[0]!.severity].className,
                )}
              >
                {SEVERITY_PRESENTATION[vitals.alerts[0]!.severity].label}
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
                      Acknowledged{' '}
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
}: {
  vitals: DroneVitals
  command: (droneId: string, kind: CommandKind) => void
  onReleaseStop: (() => void) | null
  tracked: TrackedCommand | null
}) {
  const grounded = !vitals.airborne
  const stopHeld = vitals.phase === 'emergency'
  const showTracked = showCommandReceipt(tracked, stopHeld)
  const commandsDisabled = grounded

  return (
    <div className="flex flex-wrap items-center gap-2 min-[60rem]:flex-nowrap">
      <button
        type="button"
        disabled={commandsDisabled}
        aria-label="Land"
        onClick={() => command(vitals.droneId, 'land')}
        className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink disabled:cursor-default disabled:text-ink-muted"
      >
        Land
      </button>
      <button
        type="button"
        disabled={commandsDisabled}
        aria-label="Hover"
        onClick={() => command(vitals.droneId, 'hold')}
        className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink disabled:cursor-default disabled:text-ink-muted"
      >
        Hover
      </button>
      <button
        type="button"
        disabled={commandsDisabled}
        aria-label="Recall"
        onClick={() => command(vitals.droneId, 'return-home')}
        className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink disabled:cursor-default disabled:text-ink-muted"
      >
        Recall
      </button>
      {stopHeld ? (
        onReleaseStop ? (
          <button
            type="button"
            aria-label="Release stop"
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
              Stop is held. This Fleet cannot release it from here
            </span>
          </span>
        )
      ) : (
        <button
          type="button"
          aria-label="Stop"
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
      return `${asked}, sent`
    case 'waiting':
      return `${asked}, waiting for a response`
    case 'done':
      return `${asked}, done`
    case 'refused':
      return tracked.reason ?? `${asked}, refused`
    case 'no-response':
      // Not "failed". A Drone that ignored a request and one that stopped talking are
      // not distinguishable from here.
      return `${asked}, sent, no response since`
  }
}

const COMMAND_WORDS: Readonly<Record<CommandKind, string>> = {
  land: 'Land',
  hold: 'Hover',
  'auto-land': 'Auto-land',
  'emergency-stop': 'Stop',
  'return-home': 'Recall',
}
