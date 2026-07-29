'use client'

import { useState, useSyncExternalStore } from 'react'
import {
  readLogbook,
  readServerLogbook,
  subscribeLogbook,
  upsertTrainerDrone,
} from '@/lib/logbook'
import { useFleet } from './FleetProvider'

/**
 * Trainer inventory metadata — model and created date per Fleet Drone.
 *
 * Lives in the browser Logbook (ADR-0005). Not Telemetry; never on the wire.
 */
export function TrainerDronesPanel() {
  const { snapshot } = useFleet()
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)
  const drones = snapshot.state?.drones ?? []
  const [drafts, setDrafts] = useState<Record<string, { model: string; createdDate: string }>>({})

  if (drones.length === 0) {
    return (
      <section className="flex flex-col gap-3 rounded-surface border border-hairline bg-surface-1 p-5">
        <h2 className="label m-0">Trainer Drones</h2>
        <p className="m-0 text-value text-ink-subtle">
          Waiting for the Fleet — trainer rows attach to registered Drone IDs.
        </p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-3 rounded-surface border border-hairline bg-surface-1 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="label m-0">Trainer Drones</h2>
        <p className="m-0 text-value text-ink-subtle">
          Inventory metadata for the classroom set. The same craft can join many Lessons —
          nothing here glues a Drone to one period for life.
        </p>
      </div>

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {drones.map((drone) => {
          const stored = book.trainerDrones.find((row) => row.droneId === drone.id)
          const draft = drafts[drone.id] ?? {
            model: stored?.model ?? '',
            createdDate: stored?.createdDate ?? '',
          }
          return (
            <li
              key={drone.id}
              className="flex flex-wrap items-end gap-2 border-t border-hairline pt-3 first:border-t-0 first:pt-0"
            >
              <div className="flex min-w-[8rem] flex-col gap-0.5">
                <span className="font-display text-value font-medium text-ink">{drone.name}</span>
                <span className="tnum text-value text-ink-subtle">{drone.id}</span>
              </div>
              <label className="flex flex-col gap-1">
                <span className="label">Model</span>
                <input
                  value={draft.model}
                  onChange={(event) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [drone.id]: { ...draft, model: event.target.value },
                    }))
                  }
                  className="min-h-11 w-40 rounded-pill border border-hairline bg-canvas px-3 py-1 text-value text-ink"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="label">Created</span>
                <input
                  type="date"
                  value={draft.createdDate}
                  onChange={(event) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [drone.id]: { ...draft, createdDate: event.target.value },
                    }))
                  }
                  className="min-h-11 w-40 rounded-pill border border-hairline bg-canvas px-3 py-1 text-value text-ink"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  upsertTrainerDrone(drone.id, draft.model, draft.createdDate)
                  setDrafts((prev) => {
                    const next = { ...prev }
                    delete next[drone.id]
                    return next
                  })
                }}
                className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
              >
                Save
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
