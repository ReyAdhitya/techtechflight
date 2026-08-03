import type { DroneState } from '@techtechflight/contract'
import {
  fleetReadyCountdown,
  formatFleetReadyCountdown,
} from '@/lib/fleet-ready-countdown'
import { cn } from '@/lib/utils'

/**
 * One line for how many craft will be Ready once observed charging finishes.
 *
 * Absent when ADR-0007 has nothing honest to say — never an empty placeholder.
 * Mount near FleetSummary on the Fleet / prep surface.
 */
export function FleetReadyCountdown({
  drones,
  className,
}: {
  readonly drones: readonly DroneState[]
  readonly className?: string
}) {
  const forecast = fleetReadyCountdown(drones)
  if (forecast === null) return null

  const line = formatFleetReadyCountdown(forecast)

  return (
    <p
      role="status"
      aria-label={line}
      className={cn('tnum m-0 text-body text-ink-subtle', className)}
    >
      {line}
    </p>
  )
}
