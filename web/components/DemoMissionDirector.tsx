'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { readLogbook, readServerLogbook, runningLesson, subscribeLogbook } from '@/lib/logbook'
import { readMission } from '@/lib/mission-draft'
import {
  DEMO_INCIDENT_AT,
  demoIncidentDue,
  markDemoIncidentFired,
  readDemoMission,
} from '@/lib/demo-mission'
import { useFleet } from './FleetProvider'

/**
 * The demonstration's one scripted incident, and nothing else.
 *
 * Thirty-five seconds into the Mission, one airborne Drone starts drifting toward the No-fly
 * Zone. The Alert fires from the position it reaches, the child's tablet turns red and says
 * *move away*, and the Teacher pulls it back with Recall. That is the only place Recall
 * appears in the demonstration, and it is the ninety seconds worth more than any slide about
 * safety.
 *
 * **It never lifts anything.** It picks a Drone that is already up, because it is already up
 * that makes it eligible: nothing is airborne that a Teacher did not clear, and a script that
 * broke that rule would be undoing the finding this whole round started from. Nothing happens
 * at all unless a Teacher armed the demo in Settings.
 *
 * Simulated Fleets only. `scenarios` is null on hardware, and a script that flew a real
 * aircraft into a No-fly Zone in front of a class is not a demonstration.
 */
export function DemoMissionDirector() {
  const { scenarios, vitals, now } = useFleet()
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)
  const lessonId = runningLesson(book)?.id ?? null

  useEffect(() => {
    if (scenarios === null || now === 0) return
    const state = readDemoMission()
    if (!state.armed || state.incidentFiredAt !== null) return

    const mission = readMission(lessonId)
    if (mission === null) return
    if (!demoIncidentDue(state, mission.startedAt, now)) return

    /*
     * Whichever Mission craft is up, in board order. Not a named Drone: how many are flying
     * depends on how many devices joined and took one, so a script that insisted on Drone 3
     * would do nothing on the morning nobody picked it up.
     */
    const drifting = vitals.find(
      (entry) => entry.airborne && mission.droneIds.includes(entry.droneId),
    )
    if (drifting === undefined) return

    // A flight, not a teleport. The Teacher watches it go, which is the whole point.
    scenarios.flyRoute(drifting.droneId, [DEMO_INCIDENT_AT])
    markDemoIncidentFired(now)
  }, [scenarios, vitals, now, lessonId])

  return null
}
