'use client'

import { useState, useSyncExternalStore } from 'react'
import {
  readLogbook,
  readServerLogbook,
  removeTrainerDrone,
  subscribeLogbook,
  upsertTrainerDrone,
} from '@/lib/logbook'
import { useFleet } from './FleetProvider'
import { cn } from '@/lib/utils'

/**
 * Trainer inventory metadata — optional model and created date per Fleet Drone (#80).
 *
 * Lives in the browser Logbook (ADR-0005). Not Telemetry; never on the wire. Empty model /
 * date is fine — Teachers do not need aircraft specs to run a lesson.
 */
export function TrainerDronesPanel() {
  const { snapshot } = useFleet()
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)
  const drones = snapshot.state?.drones ?? []
  const [drafts, setDrafts] = useState<Record<string, { model: string; createdDate: string }>>({})
  const [openId, setOpenId] = useState<string | null>(null)

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
    <section className="flex flex-col gap-4 rounded-surface border border-hairline bg-surface-1 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="label m-0">Trainer Drones</h2>
        <p className="m-0 text-value text-ink-subtle">
          Classroom inventory for the set. Model and created date are optional — open Add
          details only if you know them. Nothing here is required to teach.
        </p>
      </div>

      <ul className="m-0 flex list-none flex-col gap-0 p-0">
        {drones.map((drone) => {
          const stored = book.trainerDrones.find((row) => row.droneId === drone.id)
          const draft = drafts[drone.id] ?? {
            model: stored?.model ?? '',
            createdDate: stored?.createdDate ?? '',
          }
          const open = openId === drone.id
          const hasDetails =
            (stored?.model?.trim() ?? '') !== '' || (stored?.createdDate?.trim() ?? '') !== ''
          const summary = [
            stored?.model?.trim() || null,
            stored?.createdDate?.trim() || null,
          ]
            .filter(Boolean)
            .join(' · ')

          return (
            <li
              key={drone.id}
              className="flex flex-col gap-3 border-t border-hairline py-4 first:border-t-0 first:pt-0 last:pb-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-display text-value font-medium text-ink">{drone.name}</span>
                  <span className="tnum text-value text-ink-subtle">{drone.id}</span>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <span
                    className={cn(
                      'text-value',
                      hasDetails ? 'text-ink-muted' : 'text-ink-subtle',
                    )}
                  >
                    {hasDetails ? summary : 'No details yet'}
                  </span>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : drone.id)}
                    className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
                  >
                    {open ? 'Hide details' : hasDetails ? 'Edit details' : 'Add details'}
                  </button>
                </div>
              </div>

              {open && (
                <div className="flex flex-col gap-3 rounded-surface border border-dashed border-hairline bg-canvas p-4">
                  <p className="m-0 text-value text-ink-subtle">Optional — leave blank if unused.</p>
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="label">Model (optional)</span>
                      <input
                        value={draft.model}
                        placeholder="If you know it"
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [drone.id]: { ...draft, model: event.target.value },
                          }))
                        }
                        className="min-h-11 w-44 rounded-pill border border-hairline bg-surface-1 px-3 py-1 text-value text-ink"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="label">Created (optional)</span>
                      <input
                        type="date"
                        value={draft.createdDate}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [drone.id]: { ...draft, createdDate: event.target.value },
                          }))
                        }
                        className="min-h-11 w-44 rounded-pill border border-hairline bg-surface-1 px-3 py-1 text-value text-ink"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const model = draft.model.trim()
                        const createdDate = draft.createdDate.trim()
                        if (model === '' && createdDate === '') removeTrainerDrone(drone.id)
                        else upsertTrainerDrone(drone.id, model, createdDate)
                        setDrafts((prev) => {
                          const next = { ...prev }
                          delete next[drone.id]
                          return next
                        })
                        setOpenId(null)
                      }}
                      className="min-h-11 cursor-pointer rounded-pill border-0 bg-ink px-4 py-1.5 text-value font-medium text-canvas"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
