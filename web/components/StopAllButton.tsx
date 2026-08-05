'use client'

import { issueStopAll, type StopAllTarget } from '@/lib/stop-all'
import { cn } from '@/lib/utils'

/**
 * Stop every airborne craft, on one press.
 *
 * The one of the three where the hold had a real argument: Stop cuts the motors, so a
 * glance-misclick on the projector drops the whole set. It goes anyway, and the reason is
 * that per-strip Stop has always been a single press (DESIGN §4.5). A Teacher who has
 * learned that Stop means stop, at once, and then finds that the fleet-wide one wants to be
 * held is being taught two different things by the same word at the moment they can least
 * afford to work out which (DECISIONS, 2026-08-05).
 *
 * Stays red and stays last in the row, so it is not the button next to the one being
 * reached for. Issues `emergency-stop` via the callback — ADR-0011, simulated Fleet only.
 */
export function StopAllButton({
  fleet,
  onStop,
  className,
}: {
  readonly fleet: readonly StopAllTarget[]
  /** Integrator: `(droneId) => command(droneId, 'emergency-stop')`. */
  readonly onStop: (droneId: string) => void
  readonly className?: string
}) {
  const airborne = fleet.filter((entry) => entry.airborne).length
  if (airborne === 0) return null

  return (
    <button
      type="button"
      onClick={() => issueStopAll(fleet, onStop)}
      className={cn(
        'min-h-11 cursor-pointer rounded-pill border border-status-fault bg-transparent px-4 py-1.5 text-value text-status-fault',
        'hover:border-ink hover:text-ink',
        className,
      )}
    >
      Stop all ({airborne})
    </button>
  )
}
