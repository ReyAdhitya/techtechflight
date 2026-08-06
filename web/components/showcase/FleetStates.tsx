'use client'

import { motion, useReducedMotion } from 'motion/react'
import { Skeleton } from './ui/skeleton'

/**
 * Before the ground station has sent anything.
 *
 * Skeletons in the shape of the cards that are coming, not a spinner: the layout is
 * known in advance, so the board can hold its own shape and the Fleet arrives into a
 * space rather than shoving one open.
 *
 * The count is deliberately fixed at six — the classroom set the product is designed
 * for — rather than guessed from a Fleet nobody has sent yet. It is a placeholder for a
 * shape, and it never claims to be a number of Drones.
 */
export function FleetSkeleton() {
  return (
    <div className="sc-grid" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="sc-glass flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * A School that owns no Drones yet.
 *
 * Distinguished sharply from a board that cannot reach the ground station, because the
 * two look identical if nobody does this work: one is an empty cupboard and the other is
 * a broken instrument, and a Teacher must never have to guess which.
 */
export function EmptyFleet() {
  const reduced = useReducedMotion()

  return (
    <motion.div
      className="sc-glass flex flex-col items-center gap-3 px-6 py-16 text-center"
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <span className="sc-empty-mark" aria-hidden="true" />
      <h2 className="m-0 text-2xl font-semibold tracking-[-0.02em]">
        No Drones in this Fleet
      </h2>
      <p className="m-0 max-w-[46ch] text-[0.9375rem] text-[var(--sc-ink-muted)]">
        The ground station is answering, and it says this School has no Drones registered
        yet. Nothing is wrong with the board. There is simply nothing to show.
      </p>
    </motion.div>
  )
}
