'use client'

import type { DroneState } from '@techtechflight/contract'
import type { ScenarioControls } from '@/lib/fleet-link'
import type { DroneVitals } from '@/lib/vitals'
import { cn } from '@/lib/utils'
import { CameraTile } from '@/components/walls/CameraTile'

/**
 * Compact camera row under the Scope on Control.
 *
 * Watch-only thumbs in board order — same stream rules as CameraTile on Walls. Click opens
 * CameraSlide; selection follows the scope mark when one is lit.
 */
export function ScopeCameraFilmstrip({
  vitals,
  drones,
  scenarios,
  selected,
  onOpenCamera,
}: {
  vitals: readonly DroneVitals[]
  drones: readonly DroneState[]
  scenarios: ScenarioControls | null
  selected?: string | null
  onOpenCamera: (droneId: string) => void
}) {
  if (vitals.length === 0) return null

  return (
    <ul
      // `relative` so an absolutely-positioned descendant cannot escape the clip. See
      // `web/scroll-containers.test.ts`; the Student rail shipped without it and scrolled a
      // phone 856 pixels sideways.
      className="relative m-0 flex list-none gap-2 overflow-x-auto p-0 pb-1"
      aria-label="Camera filmstrip"
    >
      {vitals.map((entry) => {
        const drone = drones.find((candidate) => candidate.id === entry.droneId)
        if (!drone) return null
        const name = drone.name
        const lit = selected === entry.droneId

        return (
          <li key={entry.droneId} className="w-[8.5rem] shrink-0">
            <button
              type="button"
              onClick={() => onOpenCamera(entry.droneId)}
              aria-pressed={lit}
              aria-label={`${name} camera`}
              className={cn(
                'flex w-full cursor-pointer flex-col gap-1 rounded-sm border-0 bg-transparent p-1 text-left text-ink',
                'hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                lit && 'outline outline-2 outline-offset-2 outline-ink',
              )}
            >
              <span className="truncate text-label text-ink-muted">{name}</span>
              <CameraTile
                droneId={drone.id}
                droneName={name}
                drone={drone}
                camera={drone.telemetry?.camera}
                scenarios={scenarios}
              />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
