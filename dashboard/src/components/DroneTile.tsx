import type { DroneState } from '@techtechflight/contract'
import { formatAge } from '../age.ts'
import { formatTimeToReady } from '../battery.ts'
import { BatteryLevel } from './BatteryLevel.tsx'
import { StatusBadge } from './StatusBadge.tsx'

export interface DroneTileProps {
  readonly drone: DroneState
  /** Null when this Drone has never responded. */
  readonly ageMs: number | null
  readonly onOpenDetail: () => void
}

/**
 * One Drone, at a size that reads from a few steps away.
 *
 * Every value carries its age. A Drone that has never responded says so plainly
 * rather than showing an empty battery, because a newly added Drone and a failed one
 * must not look identical.
 */
export function DroneTile({ drone, ageMs, onOpenDetail }: DroneTileProps) {
  const noResponseYet = drone.lastContact === null
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

        {/*
         * Only when the ground station has actually watched the charge go in. Most of
         * the time there is nothing to say and nothing is said — the line is absent
         * rather than empty, so a Teacher never reads a blank where a number goes and
         * wonders whether it is loading.
         */}
        {drone.timeToReadyMs !== null && (
          <p className="tile__ready-in">{formatTimeToReady(drone.timeToReadyMs)}</p>
        )}
      </div>

      <p className="tile__contact" data-stale={drone.stale || undefined}>
        {noResponseYet
          ? 'No response yet'
          : `Response ${formatAge(ageMs ?? 0)}`}
      </p>

      <button type="button" className="tile__details" onClick={onOpenDetail}>
        Details<span className="visually-hidden"> for {drone.name}</span>
      </button>
    </article>
  )
}
