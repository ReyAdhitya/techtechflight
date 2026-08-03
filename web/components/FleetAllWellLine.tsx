import type { Status } from '@techtechflight/contract'
import { fleetAllWell } from '@/lib/fleet-all-well'
import { cn } from '@/lib/utils'

/**
 * One line that answers whether the Fleet is fine.
 *
 * Present at zero problems so a new Needs Attention is a number changing, not an element
 * materialising (DELIBERATE-POSITIONS 3). Words carry the meaning; colour only reinforces.
 * Mount near FleetSummary / Control top — Integrator wires the screen.
 */
export function FleetAllWellLine({
  drones,
  className,
}: {
  readonly drones: readonly { readonly status: Status }[]
  readonly className?: string
}) {
  const { attentionCount, sentence } = fleetAllWell(drones)
  const hasFault = drones.some((drone) => drone.status === 'Fault')

  return (
    <p
      role="status"
      aria-label={sentence}
      data-attention={attentionCount}
      className={cn(
        'tnum m-0 text-body',
        attentionCount === 0 && 'text-ink-subtle',
        attentionCount > 0 && 'font-medium',
        attentionCount > 0 && hasFault && 'text-status-fault',
        attentionCount > 0 && !hasFault && 'text-status-not-ready',
        className,
      )}
    >
      {sentence}
    </p>
  )
}
