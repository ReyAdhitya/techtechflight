'use client'

import { useState, useSyncExternalStore } from 'react'
import { useFleet } from '@/components/FleetProvider'
import { CameraSlide } from '@/components/CameraSlide'
import { readLogbook, readServerLogbook, studentOf, subscribeLogbook } from '@/lib/logbook'
import { cn } from '@/lib/utils'
import { cameraTileLabel } from './camera-wall'
import { CameraTile } from './CameraTile'
import { WallGrid, WallTile } from './WallGrid'

/**
 * Every fitted camera in the class at once — board order, watch-only tiles.
 *
 * Click a tile to open CameraSlide with the full CameraPane (Start/Stop, YOLO, QR).
 * Stream URLs stay in the school map; Telemetry never carries one.
 */
export function CameraWall({ emptyLabel = 'Waiting for the Fleet.' }: { emptyLabel?: string }) {
  const { snapshot, vitals, scenarios } = useFleet()
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)
  const [cameraDroneId, setCameraDroneId] = useState<string | null>(null)
  const drones = snapshot.state?.drones

  if (!drones || drones.length === 0) {
    return <p className="m-0 text-body text-ink-muted">{emptyLabel}</p>
  }

  const cameraDrone =
    cameraDroneId === null ? null : (drones.find((drone) => drone.id === cameraDroneId) ?? null)

  return (
    <>
      <WallGrid>
        {vitals.map((entry) => {
          const drone = drones.find((d) => d.id === entry.droneId)
          if (!drone) return null
          const name = drone.name
          const label = cameraTileLabel(name, studentOf(book, entry.droneId))
          return (
            <WallTile key={entry.droneId} className="gap-0 p-0">
              <button
                type="button"
                onClick={() => setCameraDroneId(entry.droneId)}
                className={cn(
                  'flex min-h-[6rem] w-full cursor-pointer flex-col gap-2 rounded-sm border-0 bg-transparent p-3 text-left text-ink',
                  'hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                )}
                aria-label={`${label} camera`}
              >
                <p className="m-0 font-display text-body font-medium text-ink">{label}</p>
                <CameraTile
                  droneId={drone.id}
                  droneName={name}
                  label={label}
                  drone={drone}
                  camera={drone.telemetry?.camera}
                  scenarios={scenarios}
                />
              </button>
            </WallTile>
          )
        })}
      </WallGrid>

      {cameraDrone ? (
        <CameraSlide
          droneId={cameraDrone.id}
          droneName={cameraDrone.name}
          camera={cameraDrone.telemetry?.camera}
          scenarios={scenarios}
          onClose={() => setCameraDroneId(null)}
        />
      ) : null}
    </>
  )
}
