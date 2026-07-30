'use client'

import { CameraPane } from '@/components/CameraPane'
import type { DroneState } from '@techtechflight/contract'
import type { ScenarioControls } from '@/lib/fleet-link'
import { cn } from '@/lib/utils'

/**
 * Teacher-facing demo spotlight — one craft enlarged for the class to watch.
 *
 * Watch-only chrome (C9). Reuses CameraPane like SpotlightWall; lives on Control so the
 * Teacher does not leave the sector to run a peer demo.
 */
export function PeerDemoSpotlight({
  drone,
  student,
  scenarios,
  onClose,
}: {
  readonly drone: DroneState
  readonly student: string | null
  readonly scenarios: ScenarioControls | null
  readonly onClose: () => void
}) {
  const headline = student ? `${student} — ${drone.name}` : drone.name

  return (
    <section
      aria-label="Peer demo spotlight"
      className={cn(
        'flex flex-col gap-3 rounded-surface border-2 border-ink bg-surface-1 p-4',
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="flex flex-col gap-1">
          <span className="label">Peer demo</span>
          <h2 className="m-0 font-display text-heading font-medium text-ink">{headline}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted hover:border-ink hover:text-ink"
        >
          End spotlight
        </button>
      </div>
      <CameraPane
        droneId={drone.id}
        droneName={drone.name}
        camera={drone.telemetry?.camera}
        scenarios={scenarios}
      />
    </section>
  )
}
