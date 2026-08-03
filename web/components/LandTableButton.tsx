'use client'

import { cn } from '@/lib/utils'

export type LandTableMember = {
  readonly droneId: string
  readonly airborne: boolean
}

/**
 * Land the craft at one classroom table (linked group) — not the whole Fleet.
 *
 * Integrator passes the group's members (from `linkGroupId` / table assignment) and
 * wires `onLand` to `command(id, 'land')` for each id (ADR-0011). Only airborne
 * members are asked; grounded craft stay put.
 */
export function LandTableButton({
  tableLabel,
  members,
  onLand,
  className,
}: {
  /** What the Teacher calls this group — "Table A", a link group id, etc. */
  readonly tableLabel: string
  readonly members: readonly LandTableMember[]
  /** Called with the airborne member ids only, in the order given. */
  readonly onLand: (droneIds: readonly string[]) => void
  readonly className?: string
}) {
  const airborneIds = members.filter((m) => m.airborne).map((m) => m.droneId)
  if (airborneIds.length === 0) return null

  return (
    <button
      type="button"
      onClick={() => onLand(airborneIds)}
      className={cn(
        'min-h-11 cursor-pointer rounded-pill border border-status-fault bg-transparent px-4 py-1.5 text-value text-status-fault hover:border-ink hover:text-ink',
        className,
      )}
    >
      Land {tableLabel} ({airborneIds.length})
    </button>
  )
}
