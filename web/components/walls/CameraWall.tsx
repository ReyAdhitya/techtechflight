'use client'

import { useState, useSyncExternalStore } from 'react'
import { Pause, Play } from 'lucide-react'
import type { DroneState } from '@techtechflight/contract'
import { useFleet } from '@/components/FleetProvider'
import { CameraSlide } from '@/components/CameraSlide'
import { readLogbook, readServerLogbook, studentOf, subscribeLogbook } from '@/lib/logbook'
import { cn } from '@/lib/utils'
import type { DroneVitals } from '@/lib/vitals'
import { cameraTileLabel } from './camera-wall'
import { CameraTile } from './CameraTile'
import { WallGrid, WallTile } from './WallGrid'

type FrozenFrame = {
  vitals: readonly DroneVitals[]
  drones: readonly DroneState[]
}

function snapshotFrame(
  vitals: readonly DroneVitals[],
  drones: readonly DroneState[],
): FrozenFrame {
  return {
    vitals: structuredClone(vitals),
    drones: structuredClone(drones),
  }
}

/**
 * Every fitted camera in the class at once — board order, watch-only tiles.
 *
 * Click a tile to open CameraSlide with the full CameraPane (Start/Stop, YOLO, QR).
 * Stream URLs stay in the school map; Telemetry never carries one.
 *
 * Freeze pauses what the tiles show — a snapshot of names and camera labels — while
 * Telemetry and ScenarioControls keep running for CameraSlide and the rest of the board.
 * Tile titles prefer the Logbook student name when assigned (who’s-who).
 */
export function CameraWall({ emptyLabel = 'Waiting for the Fleet.' }: { emptyLabel?: string }) {
  const { snapshot, vitals, scenarios } = useFleet()
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)
  const [cameraDroneId, setCameraDroneId] = useState<string | null>(null)
  const [frozenFrame, setFrozenFrame] = useState<FrozenFrame | null>(null)
  const frozen = frozenFrame !== null
  const liveDrones = snapshot.state?.drones

  if (!liveDrones || liveDrones.length === 0) {
    return <p className="m-0 text-body text-ink-muted">{emptyLabel}</p>
  }

  const displayVitals = frozen ? frozenFrame!.vitals : vitals
  const displayDrones = frozen ? frozenFrame!.drones : liveDrones

  const cameraDrone =
    cameraDroneId === null
      ? null
      : (liveDrones.find((drone) => drone.id === cameraDroneId) ?? null)

  const toggleFreeze = () => {
    if (frozen) {
      setFrozenFrame(null)
      return
    }
    setFrozenFrame(snapshotFrame(vitals, liveDrones))
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={toggleFreeze}
            aria-pressed={frozen}
            aria-label={
              frozen ? 'Resume camera wall updates' : 'Pause camera wall updates'
            }
            className="label inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-pill border border-hairline bg-canvas px-3 py-1.5 text-ink-muted transition-colors hover:border-ink hover:text-ink"
          >
            {frozen ? (
              <>
                <Play className="size-4" strokeWidth={1.75} aria-hidden="true" />
                Resume updates
              </>
            ) : (
              <>
                <Pause className="size-4" strokeWidth={1.75} aria-hidden="true" />
                Freeze wall
              </>
            )}
          </button>
        </div>

        <WallGrid>
          {displayVitals.map((entry) => {
            const drone = displayDrones.find((d) => d.id === entry.droneId)
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
      </div>

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
