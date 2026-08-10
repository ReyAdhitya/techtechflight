'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  HEARTBEAT_EVERY_MS,
  droneNumber,
  openClassroom,
  touchBoard,
  type ClassroomDrone,
} from '@/lib/classroom-session'
import { readLogbook, readServerLogbook, runningLesson, subscribeLogbook } from '@/lib/logbook'
import { readMission, subscribeMissionDraft } from '@/lib/mission-draft'
import { MISSION_BRIEFING_RULES } from './MissionBriefing'
import { scenarioOrUnknown } from '@/lib/mission-scenarios'
import { useDrones } from './FleetProvider'

/**
 * The classroom opens itself, from the Mission the Teacher already planned.
 *
 * Until this existed, `openClassroom` was called from tests and from nowhere else, so a
 * Student who opened the board could only ever be told to wait for a Teacher who had no way
 * to stop them waiting. The Teacher was never going to be asked to press "open the
 * classroom": they have already chosen the Scenario, drawn the zones and set the clock, and
 * a second button confirming they meant it is a step that exists for the software.
 *
 * Mounted once in the Teacher shell rather than on Lesson and again on Control, so there is
 * one writer and the two screens cannot disagree about what the class was told.
 *
 * Re-runs when the Mission draft changes (Scenario, zones, seal), not only when the Logbook
 * does. Without that, picking a Scenario never minted a classroom code.
 *
 * Nothing here reaches an aircraft, and nothing here is a Command (ADR-0011). It copies the
 * brief a Teacher wrote onto a document the Student's tablet can read.
 */
export function ClassroomOpen() {
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)
  const fleet = useDrones()
  const lesson = runningLesson(book)
  const lessonId = lesson?.id ?? null
  const lessonLabel = lesson?.label ?? ''
  // Bump when the Mission draft is written so openClassroom runs after Scenario / zones.
  const [missionTick, setMissionTick] = useState(0)

  useEffect(() => subscribeMissionDraft(() => setMissionTick((n) => n + 1)), [])

  /*
   * The board's half of the heartbeat.
   *
   * Here rather than on a screen, because a Teacher walks between Fleet, Walls and the rail
   * all lesson and a tablet must not read that as the board having died. This component is
   * mounted for as long as the Teacher shell is.
   */
  useEffect(() => {
    touchBoard()
    const beat = window.setInterval(() => touchBoard(), HEARTBEAT_EVERY_MS)
    return () => window.clearInterval(beat)
  }, [])

  useEffect(() => {
    const mission = readMission(lessonId)
    if (mission === null) return

    const scenario = scenarioOrUnknown(mission.scenarioId)
    openClassroom({
      lessonId,
      lessonLabel,
      scenarioId: mission.scenarioId,
      scenarioName: scenario.name,
      objective: scenario.objective,
      /*
       * The rules the class was actually briefed on, in the Teacher's own words, read from
       * the briefing rather than retyped. A second wording of the same rule is a second
       * rule as far as a ten year old is concerned.
       */
      rules: MISSION_BRIEFING_RULES.map((rule) => rule.label),
      limitMinutes: mission.limitMinutes ?? scenario.defaultLimitMinutes,
      checkpointCount: mission.checkpoints.length,
      missionStartedAt: mission.startedAt,
      checkpoints: mission.checkpoints,
      /*
       * The score, once the Teacher has confirmed the Mission complete and not a moment
       * before. Confirming writes the sealed Mission back to the side key, which is what
       * this effect re-reads, so the answer reaches the tablets by the same route the
       * brief did rather than by a second one.
       */
      outcome: mission.outcome,
      /*
       * The roll travels with the session so an iPad can offer names without the Teacher's
       * Logbook. Without this, join-by-code succeeded and then said the class list was empty.
       */
      roster: book.roster.map((student) => ({
        studentId: student.studentId,
        name: student.name,
      })),
      /*
       * The craft in this Lesson, by the number painted on them, so a child can tap the one
       * in their hands. Names come from the Fleet rather than being derived from the id: a
       * board that called it "Drone 3" and an airframe with 3 on the side must agree, and
       * only the Fleet knows what the Teacher renamed it to.
       */
      drones: missionDrones(mission.droneIds, fleet),
      zones: mission.zones,
      /*
       * Live once the Mission has started. Before that the brief is readable and nothing
       * else moves, which is what a Student sees while the Teacher is still setting up.
       */
      live: mission.startedAt !== null,
    })
  }, [lessonId, lessonLabel, book, fleet, missionTick])

  return null
}

/**
 * The Mission's craft as a child sees them, in the Fleet's own words.
 *
 * A Drone the Mission names but the Fleet has never reported is skipped rather than invented:
 * a grid button for an aircraft that is not there is a child walking off to find one.
 */
function missionDrones(
  droneIds: readonly string[],
  fleet: readonly { readonly id: string; readonly name: string }[],
): readonly ClassroomDrone[] {
  return droneIds
    .map((droneId) => fleet.find((drone) => drone.id === droneId))
    .filter((drone): drone is { readonly id: string; readonly name: string } => drone !== undefined)
    .map((drone) => ({
      droneId: drone.id,
      droneName: drone.name,
      number: droneNumber(drone.name, drone.id),
    }))
}
