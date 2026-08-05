'use client'

import { issueLandAll, type LandAllTarget } from '@/lib/land-all'
import { cn } from '@/lib/utils'

/**
 * Land every airborne craft, on one press.
 *
 * It used to want about a second of held pointer, with a fill bar, and a keyboard path that
 * armed on the first press and fired on the second. The guard was aimed at a glance-misclick
 * on the projector emptying the room. A Teacher reaching for Land all is usually reaching
 * for it because something is going wrong, and a control that ignores the first press is a
 * control that has to be learned before it works — so the hold cost more than the misclick
 * it was insuring against (DECISIONS, 2026-08-05).
 *
 * Landing is also the recoverable one. Issues `land` Commands via the callback — ADR-0011,
 * simulated Fleet only.
 */
export function LandAllButton({
  fleet,
  onLand,
  className,
}: {
  readonly fleet: readonly LandAllTarget[]
  /** Integrator: `(droneId) => command(droneId, 'land')`. */
  readonly onLand: (droneId: string) => void
  readonly className?: string
}) {
  const airborne = fleet.filter((entry) => entry.airborne).length
  if (airborne === 0) return null

  return (
    <button
      type="button"
      onClick={() => issueLandAll(fleet, onLand)}
      className={cn(
        'min-h-11 cursor-pointer rounded-pill border border-status-fault bg-transparent px-4 py-1.5 text-value text-status-fault',
        'hover:border-ink hover:text-ink',
        className,
      )}
    >
      Land all ({airborne})
    </button>
  )
}
