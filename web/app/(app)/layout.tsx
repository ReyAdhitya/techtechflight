'use client'

import { useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import type { DroneId, Telemetry } from '@techtechflight/contract'
import { FleetProvider, useFleet } from '@/components/FleetProvider'
import { TrainingWheelsProvider } from '@/lib/training-wheels'
import { CommandPalette } from '@/components/CommandPalette'
import { SiteHeader } from '@/components/SiteHeader'
import { MissionRunRail } from '@/components/MissionRunRail'
import { isMissionBriefingComplete, readMissionBriefing } from '@/components/MissionBriefing'
import {
  evaluatePreFlightSeven,
  isPreFlightSevenDone,
  propellersTicked,
  readPreFlightSeven,
} from '@/lib/preflight-seven'
import { enclosesAnything } from '@/lib/airspace'
import { emptyClearanceState, isActiveMission, shouldAwaitClearance } from '@/lib/clearance'
import {
  missionsFrom,
  readLogbook,
  readServerLogbook,
  runningLesson,
  studentOf,
  subscribeLogbook,
  type LessonRecord,
} from '@/lib/logbook'
import type { Mission } from '@/lib/mission'
import type { RunStepInput } from '@/lib/run-step'
import { readTeams } from '@/lib/teams'
import { alertQueue } from '@/lib/vitals'

/**
 * Everything a Teacher uses, around one connection to the ground station.
 *
 * The board, the timeline, the lesson and the per-Drone view all read the same Fleet.
 * Holding the connection here rather than on each page means moving between them does
 * not reconnect, and — more importantly — two screens can never disagree about what the
 * Fleet is doing, which a socket per page would allow during a reconnect.
 *
 * `/showcase` deliberately sits outside this group: it carries its own chrome and its
 * own scenario switcher, and is a comparison rather than part of the product.
 */

function missionZoneDrawn(mission: Mission): boolean {
  return mission.zones.some((zone) => zone.kind === 'mission' && enclosesAnything(zone))
}

function focusMission(lesson: LessonRecord): Mission | null {
  const missions = missionsFrom(lesson)
  if (missions.length === 0) return null
  return (
    missions.find((mission) => mission.startedAt !== null && mission.outcome === null) ??
    missions[0] ??
    null
  )
}

function teamsAssigned(lesson: LessonRecord): boolean {
  const teams = readTeams()
  if (teams.some((team) => team.studentIds.length > 0 || team.droneId !== null)) return true
  return Object.keys(lesson.assignments ?? {}).length > 0
}

function dronePreFlightDone(
  lessonId: string,
  droneId: DroneId,
  telemetry: Telemetry | null | undefined,
): boolean {
  const propellers = propellersTicked(readPreFlightSeven(lessonId), droneId)
  return isPreFlightSevenDone(evaluatePreFlightSeven(telemetry ?? null, propellers))
}

function lessonPreFlightDone(
  lesson: LessonRecord,
  mission: Mission | null,
  telemetryFor: (droneId: DroneId) => Telemetry | null | undefined,
): boolean {
  const droneIds =
    mission !== null && mission.droneIds.length > 0
      ? mission.droneIds
      : Object.keys(lesson.assignments ?? {})
  if (droneIds.length === 0) return false
  return droneIds.every((droneId) =>
    dronePreFlightDone(lesson.id, droneId, telemetryFor(droneId)),
  )
}

function deriveRunStepInput({
  lesson,
  mission,
  book,
  vitals,
  isAcknowledged,
  pathname,
  telemetryFor,
}: {
  readonly lesson: LessonRecord
  readonly mission: Mission | null
  readonly book: ReturnType<typeof readLogbook>
  readonly vitals: ReturnType<typeof useFleet>['vitals']
  readonly isAcknowledged: ReturnType<typeof useFleet>['isAcknowledged']
  readonly pathname: string
  readonly telemetryFor: (droneId: DroneId) => Telemetry | null | undefined
}): RunStepInput {
  const missionDrones =
    mission !== null && mission.droneIds.length > 0
      ? mission.droneIds
      : vitals.map((entry) => entry.droneId)

  const missionVitals = vitals.filter((entry) => missionDrones.includes(entry.droneId))
  const airborne = missionVitals.some((entry) => entry.airborne)
  const missionStarted =
    (mission !== null && mission.startedAt !== null && mission.outcome === null) || airborne
  const allDown = missionStarted && missionVitals.every((entry) => !entry.airborne)
  const confirmedComplete = mission?.outcome !== null

  const clearanceState = emptyClearanceState()
  let hasPendingClearance = false
  if (mission !== null && isActiveMission(mission)) {
    for (const droneId of mission.droneIds) {
      const entry = vitals.find((row) => row.droneId === droneId)
      if (entry === undefined) continue
      const preFlightDone = dronePreFlightDone(lesson.id, droneId, telemetryFor(droneId))
      if (
        shouldAwaitClearance(
          {
            droneId,
            status: entry.status,
            studentId: studentOf(book, droneId),
            preFlightDone,
            mission,
          },
          clearanceState,
        )
      ) {
        hasPendingClearance = true
        break
      }
    }
  }

  const onControl = pathname.startsWith('/control')
  const inFlight = missionStarted && !allDown && !confirmedComplete

  return {
    hasScenario: mission !== null && mission.scenarioId !== 'legacy-exercise',
    hasZones: mission !== null && missionZoneDrawn(mission),
    hasTeams: teamsAssigned(lesson),
    preFlightDone: lessonPreFlightDone(lesson, mission, telemetryFor),
    briefingDone: isMissionBriefingComplete(readMissionBriefing(lesson.id)),
    hasPendingClearance,
    missionStarted,
    hasAlerts: alertQueue(vitals, isAcknowledged).length > 0,
    allDown,
    confirmedComplete,
    onReports: pathname.startsWith('/reports'),
    ...(inFlight && onControl ? { watchingTelemetry: true } : {}),
  }
}

/**
 * Mission chrome on the app frame — left step rail while a Lesson runs.
 *
 * Replaces the top-only Run bar for the Photo 3 workflow: Teachers walk twelve steps
 * top-to-bottom on the left; SiteNav stays the room switcher. Hidden when no Lesson is
 * open so Fleet setup days stay uncluttered.
 */
function AppMissionChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { vitals, isAcknowledged, snapshot } = useFleet()
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)
  const lesson = runningLesson(book)

  const state = useMemo(() => {
    if (!lesson) return null
    const mission = focusMission(lesson)
    const telemetryFor = (droneId: DroneId) =>
      snapshot.state?.drones.find((drone) => drone.id === droneId)?.telemetry ?? null
    return deriveRunStepInput({
      lesson,
      mission,
      book,
      vitals,
      isAcknowledged,
      pathname,
      telemetryFor,
    })
  }, [book, isAcknowledged, lesson, pathname, snapshot.state, vitals])

  if (!lesson || state === null) return <>{children}</>

  return (
    <div className="flex min-h-0 flex-col min-[60rem]:flex-row">
      <MissionRunRail state={state} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <FleetProvider>
      <TrainingWheelsProvider>
        <a className="skip-link" href="#content">
          Skip to the Fleet
        </a>
        <SiteHeader />
        <AppMissionChrome>{children}</AppMissionChrome>
        <CommandPalette />
      </TrainingWheelsProvider>
    </FleetProvider>
  )
}
