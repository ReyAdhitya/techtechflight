'use client'

import { motion, useReducedMotion } from 'motion/react'
import { FILTERS, type FleetFilter } from './visual-language'

export interface FleetFiltersProps {
  readonly value: FleetFilter
  readonly counts: Readonly<Record<FleetFilter, number>>
  readonly onChange: (next: FleetFilter) => void
}

/**
 * The segmented control, with the active pill travelling between buckets via a shared
 * layout id rather than appearing in its new place.
 *
 * Worth being explicit about the cost, because it is the sharpest disagreement between
 * the two boards: filtering re-lays-out the grid, and the restrained board deliberately
 * never reorders, so that "Drone 4 is the broken one" stays a fact about a position on
 * screen. Every count is on the control itself, so at least a Teacher never has to press
 * a bucket to discover it is empty.
 */
export function FleetFilters({ value, counts, onChange }: FleetFiltersProps) {
  const reduced = useReducedMotion()

  return (
    <div className="sc-segment" role="group" aria-label="Which Drones to show">
      {FILTERS.map((filter) => {
        const active = filter.id === value
        return (
          <button
            key={filter.id}
            type="button"
            className="sc-segment__button"
            data-active={active || undefined}
            aria-pressed={active}
            onClick={() => onChange(filter.id)}
          >
            {active && (
              <motion.span
                layoutId="sc-filter-pill"
                className="sc-segment__pill"
                transition={
                  reduced
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 420, damping: 36 }
                }
              />
            )}
            {filter.label}
            <span className="sc-tnum opacity-60">{counts[filter.id]}</span>
          </button>
        )
      })}
    </div>
  )
}
