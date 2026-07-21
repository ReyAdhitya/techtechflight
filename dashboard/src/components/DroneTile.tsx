import type { DroneState } from '@techtechflight/contract'
import { formatAge } from '../age.ts'
import { BatteryLevel } from './BatteryLevel.tsx'
import { StatusBadge } from './StatusBadge.tsx'

export interface DroneTileProps {
  readonly drone: DroneState
  /** Null when this Drone has never been heard from. */
  readonly ageMs: number | null
  readonly onOpenDetail: () => void
}

/**
 * One Drone, at a size that reads from a few steps away.
 *
 * Every value carries its age. A Drone that has never been heard from says so plainly
 * rather than showing an empty battery, because a newly added Drone and a failed one
 * must not look identical.
 */
export function DroneTile({ drone, ageMs, onOpenDetail }: DroneTileProps) {
  const neverHeardFrom = drone.lastContact === null
  const headingId = `drone-${drone.id}-name`

  return (
    <article className="tile" data-status={drone.status} aria-labelledby={headingId}>
      <h2 className="tile__name" id={headingId}>
        {drone.name}
      </h2>

      <StatusBadge status={drone.status} />

      <div className="tile__telemetry">
        {drone.telemetry ? (
          <BatteryLevel
            telemetry={drone.telemetry}
            stale={drone.stale}
            low={drone.status === 'Not Ready'}
          />
        ) : (
          <p className="tile__never">No Telemetry yet</p>
        )}
      </div>

      <p className="tile__contact" data-stale={drone.stale || undefined}>
        {neverHeardFrom
          ? 'Never heard from'
          : `Heard from ${formatAge(ageMs ?? 0)}`}
      </p>

      <button type="button" className="tile__details" onClick={onOpenDetail}>
        Details<span className="visually-hidden"> for {drone.name}</span>
      </button>
    </article>
  )
}
