'use client'

import { useEffect, useState } from 'react'
import type { DroneState } from '@techtechflight/contract'
import {
  readSpareNomination,
  spareAmongFleet,
  writeSpareNomination,
} from '@/lib/spare-nomination'
import { cn } from '@/lib/utils'

/**
 * Nominate one craft as the swap for this prep.
 *
 * One spare at a time, shown in words (not colour alone). Mount on Fleet/prep or Settings.
 */
export function SpareNomination({
  drones,
  className,
}: {
  readonly drones: readonly Pick<DroneState, 'id' | 'name'>[]
  readonly className?: string
}) {
  const [spareId, setSpareId] = useState<string | null>(null)

  useEffect(() => {
    const fleetIds = new Set(drones.map((drone) => drone.id))
    const stored = spareAmongFleet(readSpareNomination(), fleetIds)
    setSpareId(stored)
    if (stored === null && readSpareNomination() !== null) {
      writeSpareNomination(null)
    }
  }, [drones])

  const spare = drones.find((drone) => drone.id === spareId) ?? null

  function nominate(id: string): void {
    writeSpareNomination(id)
    setSpareId(id)
  }

  function clear(): void {
    writeSpareNomination(null)
    setSpareId(null)
  }

  return (
    <section
      className={cn(
        'flex flex-col gap-3 rounded-surface border border-hairline bg-surface-1 p-4',
        className,
      )}
      aria-label="Spare Drone"
    >
      <div className="flex flex-col gap-1">
        <h2 className="label m-0">Spare Drone</h2>
        <p className="m-0 text-value text-ink-subtle" role="status">
          {spare === null ? (
            'No spare nominated.'
          ) : (
            <>
              Swap: <span className="font-medium text-ink">{spare.name}</span>
            </>
          )}
        </p>
      </div>

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {drones.map((drone) => {
          const selected = drone.id === spareId
          return (
            <li key={drone.id}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-value text-ink">
                <input
                  type="radio"
                  name="spare-nomination"
                  checked={selected}
                  onChange={() => nominate(drone.id)}
                  className="size-4"
                />
                <span>{drone.name}</span>
                {selected ? (
                  <span className="rounded-pill border border-hairline px-2 py-0.5 text-ink-subtle">
                    Spare
                  </span>
                ) : null}
              </label>
            </li>
          )
        })}
      </ul>

      {spareId !== null ? (
        <button
          type="button"
          onClick={clear}
          className="min-h-11 w-fit cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted hover:border-ink hover:text-ink"
        >
          Clear spare
        </button>
      ) : null}
    </section>
  )
}
