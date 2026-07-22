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
      {/*
       * The board's only h1. ADR-0004 bars a headline above the Fleet summary, so the
       * summary count is the heading rather than sitting under one — which is also the
       * truth of the page: a Teacher opening this is asking exactly this question.
       */}
      <h1 className="summary__headline">
        <span className="summary__count">{usable}</span>
        <span className="summary__of"> of {drones.length} ready</span>
      </h1>

      {/*
       * Announced, because this is the one number whose whole job is to reach a Teacher
       * who is looking at the room rather than the board. Named to tell it apart from the
       * board's other live region, which speaks about the ground station.
       */}
      <p
        className="summary__attention"
        data-severity={attentionSeverity(drones)}
        role="status"
        aria-label="Drones needing attention"
      >
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

/**
 * How loudly the Needs Attention count should speak.
 *
 * The bucket deliberately hides which Drones are which, but flattening both into the
 * coral would undo the distinction the rest of the board is built on (ADR-0004): amber
 * is a Teacher with charging to do, coral is a Drone leaving the set. A Fleet that only
 * needs plugging in must not shout as loudly as one with a Drone out of service.
 */
function attentionSeverity(drones: readonly DroneState[]): 'fault' | 'fixable' | undefined {
  if (drones.some((drone) => drone.status === 'Fault')) return 'fault'
  if (drones.some((drone) => needsAttention(drone.status))) return 'fixable'
  return undefined
}
