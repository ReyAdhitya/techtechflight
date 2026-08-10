'use client'

import { useEffect, useState } from 'react'
import { readLogbook, runningLesson } from '@/lib/logbook'
import { putMission } from '@/lib/mission-draft'
import {
  DEMO_MISSION_MINUTES,
  armDemoMission,
  demoMission,
  disarmDemoMission,
  readDemoMission,
} from '@/lib/demo-mission'
import { useDrones, useFleet } from './FleetProvider'

/**
 * Set the demonstration Mission up in one press, then walk the lesson.
 *
 * It writes the airspace and the task: the Scenario, one No-fly Zone, three points and a two
 * minute clock. It does not tick pre-flight, brief the class or take anything off the ground.
 * Those are the lesson, and the demonstration is worth nothing if the presenter skips them:
 * what a school is being shown is a Teacher granting a takeoff, not a button that produces
 * flying Drones.
 *
 * On a simulated Fleet only. Arming this on real hardware would set up a script that flies an
 * aircraft into a No-fly Zone in front of a class.
 */
export function DemoMissionPanel() {
  const { demo } = useFleet()
  const drones = useDrones()
  const [armed, setArmed] = useState(false)
  const [said, setSaid] = useState<string | null>(null)

  useEffect(() => setArmed(readDemoMission().armed), [])

  if (!demo) {
    return (
      <section className="flex flex-col gap-2 rounded-surface border border-hairline bg-surface-1 p-5">
        <h2 className="label m-0">The two minute demonstration</h2>
        <p className="m-0 max-w-[62ch] text-value text-ink-subtle">
          Not offered on this Fleet. It scripts a Drone drifting into a No-fly Zone, which is
          a thing to do to a simulation and not to an aircraft in a room.
        </p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-3 rounded-surface border border-hairline bg-surface-1 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="label m-0">The two minute demonstration</h2>
        <p className="m-0 max-w-[62ch] text-value text-ink-subtle">
          Sets up the airspace and the task: Search and Rescue, one No-fly Zone over the
          bench, three points and a {DEMO_MISSION_MINUTES} minute clock. Real minutes, not a
          fast clock. Then walk the rail: put teams on craft, tick pre-flight, brief the class
          and grant a takeoff. Thirty-five seconds in, one Drone drifts toward the zone and
          the Teacher recalls it.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            const lessonId = runningLesson(readLogbook())?.id ?? null
            putMission(lessonId, demoMission(lessonId, drones.map((drone) => drone.id)))
            armDemoMission()
            setArmed(true)
            setSaid('Set up. Open the Mission run and walk the steps.')
          }}
          className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
        >
          Set up the demonstration
        </button>
        {armed ? (
          <button
            type="button"
            onClick={() => {
              disarmDemoMission()
              setArmed(false)
              setSaid('The scripted drift will not happen.')
            }}
            className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-subtle hover:border-ink hover:text-ink"
          >
            Turn the incident off
          </button>
        ) : null}
      </div>

      <p className="m-0 text-value text-ink-muted" role="status">
        {said ??
          (armed
            ? 'Armed. The scripted drift happens once, thirty-five seconds into the Mission.'
            : 'Not set up.')}
      </p>
    </section>
  )
}
