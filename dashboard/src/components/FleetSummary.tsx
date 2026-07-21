import type { DroneState } from '@techtechflight/contract'
import { isUsable, needsAttention } from '@techtechflight/contract'

/**
 * The answer to the only question a Teacher actually has, before they read any detail.
 *
 * The Needs Attention count is present even when it is zero, so a Drone newly needing attention
 * is a number changing rather than an element materialising.
 */
export function FleetSummary({ drones }: { drones: readonly DroneState[] }) {
  const usable = drones.filter((drone) => isUsable(drone.status)).length
  const attention = drones.filter((drone) => needsAttention(drone.status)).length
  const flying = drones.filter((drone) => drone.status === 'Flying').length

  return (
    <header className="summary">
      <p className="summary__headline">
        <span className="summary__count">{usable}</span>
        <span className="summary__of"> of {drones.length} ready</span>
      </p>

      <p className="summary__attention" data-any={attention > 0 || undefined}>
        {attention} {attention === 1 ? 'needs' : 'need'} attention
      </p>

      {flying > 0 && (
        <p className="summary__flying">
          {flying} flying
        </p>
      )}
    </header>
  )
}
