'use client'

import { useState } from 'react'
import type { DroneId, DroneState } from '@techtechflight/contract'
import { motion, useReducedMotion } from 'motion/react'
import { ageMs } from '@/lib/age'
import type { FleetSnapshot } from '@/lib/fleet-connection'
import { ConnectionBanner } from './ConnectionBanner'
import { DroneDetailDialog } from './DroneDetailDialog'
import { DroneTile } from './DroneTile'
import { FleetSummary } from './FleetSummary'

export interface FleetBoardProps {
  readonly snapshot: FleetSnapshot
  /** The browser's clock, ticking, so ages stay honest between snapshots. */
  readonly now: number
  /** True when `snapshot` is a stand-in Fleet rather than one the ground station sent. */
  readonly demo?: boolean
}

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * The whole Fleet on one screen.
 *
 * Tiles are laid out in the ground station's board order and never reorder as Status
 * changes, so position is learnable. Drones needing attention are separated by how they
 * look — colour, shape, and word — rather than by moving, because a tile that jumps
 * when a battery dips destroys the muscle memory the ordering exists to build.
 */
export function FleetBoard({ snapshot, now, demo = false }: FleetBoardProps) {
  const [openDroneId, setOpenDroneId] = useState<DroneId | null>(null)
  const reduced = useReducedMotion()
  const { state, receivedAt } = snapshot

  if (!state || receivedAt === null) {
    return (
      <main
        id="content"
        tabIndex={-1}
        className="flex min-h-full flex-col justify-center gap-6 p-8"
      >
        <ConnectionBanner connection={snapshot.connection} demo={demo} />
      </main>
    )
  }

  /*
   * A School before its Drones are registered.
   *
   * The summary is built to answer one question, and with no Fleet behind it there is no
   * question to answer — it rendered "0 of 0 ready" over an empty grid, which is
   * indistinguishable from a board that has failed. Saying so plainly is the same rule
   * the tiles follow for a Drone never heard from: an absence a Teacher can understand
   * must never be shown as an empty version of a normal reading.
   *
   * The ConnectionBanner stays above it, because an empty Fleet and an unreachable
   * ground station are different problems and only one of them is about the Fleet.
   */
  if (state.drones.length === 0) {
    return (
      <main
        id="content"
        tabIndex={-1}
        className="flex min-h-full flex-col justify-center gap-6 p-8"
      >
        <ConnectionBanner connection={snapshot.connection} demo={demo} />
        <div className="flex flex-col gap-2">
          <h1 className="m-0 font-display text-heading font-medium">
            No Drones in this Fleet
          </h1>
          <p className="m-0 max-w-[42ch] text-body text-ink-muted">
            This School has no Drones registered yet. They appear here as soon as the
            ground station knows about them.
          </p>
        </div>
      </main>
    )
  }

  const age = (drone: DroneState) => ageMs(drone, state, receivedAt, now)
  const openDrone = state.drones.find((drone) => drone.id === openDroneId) ?? null

  return (
    <main
      id="content"
      tabIndex={-1}
      className="flex min-h-full flex-col gap-4 p-4 min-[26rem]:gap-6 min-[26rem]:p-8"
    >
      <ConnectionBanner connection={snapshot.connection} demo={demo} />

      <motion.div
        className="fleet-summary-shell"
        initial={reduced ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : { duration: 0.55, ease: EASE }}
      >
        <FleetSummary drones={state.drones} />
      </motion.div>

      {/*
       * The tile minimum is in rem, so it scales with the type inside it. Left in px it
       * would be the one measurement on the board that ignored large format, and tiles
       * would tighten around their own text exactly when they were meant to open up.
       */}
      <ul className="fleet-grid grid flex-1 list-none content-start gap-4 p-0">
        {state.drones.map((drone, index) => (
          <motion.li
            key={drone.id}
            className="flex"
            initial={reduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduced
                ? { duration: 0 }
                : { duration: 0.5, delay: Math.min(index, 12) * 0.04, ease: EASE }
            }
          >
            <DroneTile
              drone={drone}
              ageMs={age(drone)}
              onOpenDetail={() => setOpenDroneId(drone.id)}
            />
          </motion.li>
        ))}
      </ul>

      <DroneDetailDialog
        drone={openDrone}
        ageMs={openDrone ? age(openDrone) : null}
        onClose={() => setOpenDroneId(null)}
      />
    </main>
  )
}
