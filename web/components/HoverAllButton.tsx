'use client'

import { issueHoverAll, type HoverAllTarget } from '@/lib/hover-all'
import { cn } from '@/lib/utils'

/**
 * Hover every airborne craft, on one press.
 *
 * Same call as Land all, and for the plainer reason: hovering is the least consequential
 * thing a Teacher can do to the room. Everything stays exactly where it is and nothing has
 * to be recovered from. A hold on this one was the pattern being applied rather than the
 * risk being weighed (DECISIONS, 2026-08-05).
 *
 * Issues `hold` Commands via the callback — ADR-0011, simulated Fleet only.
 */
export function HoverAllButton({
  fleet,
  onHover,
  className,
}: {
  readonly fleet: readonly HoverAllTarget[]
  /** Integrator: `(droneId) => command(droneId, 'hold')`. */
  readonly onHover: (droneId: string) => void
  readonly className?: string
}) {
  const airborne = fleet.filter((entry) => entry.airborne).length
  if (airborne === 0) return null

  return (
    <button
      type="button"
      onClick={() => issueHoverAll(fleet, onHover)}
      className={cn(
        'min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink',
        className,
      )}
    >
      Hover all ({airborne})
    </button>
  )
}
