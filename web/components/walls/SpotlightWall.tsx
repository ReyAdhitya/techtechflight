'use client'

import { useState } from 'react'
import { useFleet } from '@/components/FleetProvider'
import { CameraPane } from '@/components/CameraPane'
import { cn } from '@/lib/utils'

/**
 * One large CameraPane plus a thumbnail row to switch focus.
 */
export function SpotlightWall() {
  const { snapshot, scenarios } = useFleet()
  const drones = snapshot.state?.drones ?? []
  const [focusId, setFocusId] = useState<string | null>(null)

  if (drones.length === 0) {
    return <p className="m-0 text-body text-ink-muted">Waiting for the Fleet.</p>
  }

  const focus = drones.find((d) => d.id === (focusId ?? drones[0]!.id)) ?? drones[0]!

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2" aria-label={`${focus.name} spotlight`}>
        <h2 className="m-0 font-display text-body font-medium text-ink">{focus.name}</h2>
        <CameraPane
          droneId={focus.id}
          droneName={focus.name}
          camera={focus.telemetry?.camera}
          scenarios={scenarios}
        />
      </section>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Camera thumbnails">
        {drones.map((drone) => {
          const selected = drone.id === focus.id
          return (
            <li key={drone.id}>
              <button
                type="button"
                onClick={() => setFocusId(drone.id)}
                className={cn(
                  'min-h-11 rounded-sm border px-3 py-2 text-caption',
                  selected
                    ? 'border-ink bg-surface-1 text-ink'
                    : 'border-hairline bg-canvas text-ink-subtle',
                )}
                aria-pressed={selected}
              >
                {drone.name}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
