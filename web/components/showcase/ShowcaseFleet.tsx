'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import type { DroneId, DroneState } from '@techtechflight/contract'
import { ageMs } from '@/lib/age'
import type { FleetSnapshot } from '@/lib/fleet-connection'
import { ConnectionStrip } from './ConnectionStrip'
import { DroneCard } from './DroneCard'
import { DroneDetailPanel } from './DroneDetailPanel'
import { FleetFilters } from './FleetFilters'
import { FleetOverview } from './FleetOverview'
import { EmptyFleet, FleetSkeleton } from './FleetStates'
import { useStatusChanges } from './hooks'
import { filterCounts, focusDrone, matchesFilter, type FleetFilter } from './visual-language'

const NO_DRONES: readonly DroneState[] = []

export interface ShowcaseFleetProps {
  readonly snapshot: FleetSnapshot
  /** The browser's clock, ticking, so ages stay honest between Fleet States. */
  readonly now: number
  readonly dark: boolean
}

/**
 * The whole Fleet on one screen, maximalist edition.
 *
 * Everything below the connection strip is a pure function of a Fleet State and a clock
 * reading — the same seam the restrained board has, and the reason the scenario switcher
 * can drive this from fixtures without a socket anywhere near it.
 */
export function ShowcaseFleet({ snapshot, now, dark }: ShowcaseFleetProps) {
  const reduced = useReducedMotion()
  const [filter, setFilter] = useState<FleetFilter>('all')
  const [selectedId, setSelectedId] = useState<DroneId | null>(null)
  const [openId, setOpenId] = useState<DroneId | null>(null)

  const { state, receivedAt } = snapshot
  const drones = useMemo(() => state?.drones ?? NO_DRONES, [state])
  const changed = useStatusChanges(drones)
  const counts = useMemo(() => filterCounts(drones), [drones])

  const age = (drone: DroneState) =>
    state && receivedAt !== null ? ageMs(drone, state, receivedAt, now) : null

  const visible = drones.filter((drone) => matchesFilter(drone, filter))
  const focus = drones.find((drone) => drone.id === selectedId) ?? focusDrone(drones)
  const open = drones.find((drone) => drone.id === openId) ?? null

  return (
    <main className="mx-auto flex w-full max-w-[92rem] flex-col gap-5 px-4 pb-16 sm:px-8">
      <ConnectionStrip connection={snapshot.connection} />

      {!state || receivedAt === null ? (
        <FleetSkeleton />
      ) : drones.length === 0 ? (
        <EmptyFleet />
      ) : (
        <>
          <FleetOverview
            drones={drones}
            focus={focus}
            focusAgeMs={focus ? age(focus) : null}
            dark={dark}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <FleetFilters value={filter} counts={counts} onChange={setFilter} />
            <p className="sc-label m-0">
              {visible.length} of {drones.length} shown
            </p>
          </div>

          {/*
           * One Tooltip provider for the whole grid rather than one per card: a provider
           * per Drone means six independent delay timers, and the second Tooltip a
           * Teacher hovers waits the full delay again instead of opening immediately.
           */}
          <TooltipPrimitive.Provider delayDuration={200} skipDelayDuration={400}>
            <motion.ul
              className="sc-grid"
              layout={!reduced}
              initial={reduced ? false : 'hidden'}
              animate="shown"
              variants={{
                hidden: {},
                shown: { transition: { staggerChildren: 0.045, delayChildren: 0.08 } },
              }}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {visible.map((drone) => (
                  <motion.li key={drone.id} layout={!reduced} className="flex">
                    <DroneCard
                      drone={drone}
                      ageMs={age(drone)}
                      selected={focus?.id === drone.id}
                      changed={changed.has(drone.id)}
                      onSelect={() => setSelectedId(drone.id)}
                      onOpenDetail={() => setOpenId(drone.id)}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          </TooltipPrimitive.Provider>

          {visible.length === 0 && (
            <p className="m-0 py-10 text-center text-[0.9375rem] text-[var(--sc-ink-muted)]">
              No Drones in this bucket right now.
            </p>
          )}
        </>
      )}

      <DroneDetailPanel
        drone={open}
        ageMs={open ? age(open) : null}
        dark={dark}
        onClose={() => setOpenId(null)}
      />
    </main>
  )
}
