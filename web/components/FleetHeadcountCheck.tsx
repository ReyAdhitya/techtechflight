'use client'

import type { DroneState } from '@techtechflight/contract'
import {
  fleetHeadcount,
  formatHeadcount,
  togglePresent,
} from '@/lib/fleet-headcount'
import { cn } from '@/lib/utils'

/**
 * Pre-class physical headcount — tick each craft on the bench.
 *
 * Count stays visible at zero; missing names stay in board order. Mount on the
 * Fleet / prep screen. Present set is controlled so the Integrator can persist it.
 */
export function FleetHeadcountCheck({
  drones,
  presentIds,
  onPresentIdsChange,
  className,
}: {
  readonly drones: readonly Pick<DroneState, 'id' | 'name'>[]
  readonly presentIds: ReadonlySet<string>
  readonly onPresentIdsChange: (next: ReadonlySet<string>) => void
  readonly className?: string
}) {
  const result = fleetHeadcount(drones, presentIds)
  const summary = formatHeadcount(result)

  return (
    <section
      className={cn(
        'flex flex-col gap-3 rounded-surface border border-hairline bg-surface-1 p-4',
        className,
      )}
      aria-label="Fleet headcount"
    >
      <div className="flex flex-col gap-1">
        <h2 className="label m-0">Headcount</h2>
        <p className="tnum m-0 text-body text-ink" role="status" aria-label={summary}>
          {summary}
        </p>
      </div>

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {drones.map((drone) => {
          const checked = presentIds.has(drone.id)
          return (
            <li key={drone.id}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-value text-ink">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onPresentIdsChange(togglePresent(presentIds, drone.id))}
                  className="size-4"
                />
                <span>{drone.name}</span>
                <span className="text-ink-muted">{checked ? 'present' : 'missing'}</span>
              </label>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-col gap-1 border-t border-hairline pt-3">
        <p className="label m-0 text-ink-subtle">Missing</p>
        {result.missing.length === 0 ? (
          <p className="m-0 text-value text-ink-muted">None — every craft is ticked.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0" aria-label="Missing craft">
            {result.missing.map((craft) => (
              <li key={craft.id} className="text-value text-ink-subtle">
                {craft.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
