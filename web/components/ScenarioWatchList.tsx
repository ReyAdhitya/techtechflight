'use client'

import { useSyncExternalStore } from 'react'
import type { ScenarioId } from '@/lib/mission'
import { scenarioOrUnknown } from '@/lib/mission-scenarios'
import { missionClock } from '@/lib/mission-clock'
import { readMission } from '@/lib/mission-draft'
import {
  readLogbook,
  readServerLogbook,
  runningLesson,
  subscribeLogbook,
} from '@/lib/logbook'
import { useFleet } from './FleetProvider'

/**
 * What the Teacher watches for this Scenario — poster column, live on Control.
 */
export function ScenarioWatchList({ scenarioId }: { readonly scenarioId: ScenarioId }) {
  const { now } = useFleet()
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)
  const lesson = runningLesson(book)
  const mission = readMission(lesson?.id ?? null)
  const scenario = scenarioOrUnknown(scenarioId)
  const clock = mission !== null ? missionClock(mission, now) : null

  return (
    <section
      className="flex flex-col gap-2 rounded-surface border border-hairline bg-surface-1 px-4 py-3"
      aria-label="What to watch for this Scenario"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="label m-0">You are watching, {scenario.name}</h2>
        {clock !== null ? (
          <p className="tnum m-0 text-value text-ink-subtle">{clock.words}</p>
        ) : null}
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {scenario.teacherWatches.map((item) => (
          <li
            key={item}
            className="rounded-pill border border-hairline bg-canvas px-3 py-1 text-value text-ink"
          >
            {item}
          </li>
        ))}
      </ul>
      <p className="m-0 text-value text-ink-muted">
        Progress the Fleet is not measuring prints as Not measured. Never invented.
      </p>
    </section>
  )
}
