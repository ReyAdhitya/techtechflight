'use client'

import { useState } from 'react'
import type { DroneId, DroneState } from '@techtechflight/contract'
import { needsAttention } from '@techtechflight/contract'
import { motion, useReducedMotion } from 'motion/react'
import { ageMs } from '@/lib/age'
import type { FleetSnapshot } from '@/lib/fleet-connection'
import { cn } from '@/lib/utils'
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
 * The Fleet size at which finding a Drone stops being a glance and starts being a search.
 *
 * A classroom set is six to eight and fits on one screen. Past that a Teacher is
 * scanning, and scanning is what the filter exists to replace.
 */
const FILTERABLE_FROM = 9

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
  const [query, setQuery] = useState('')
  const [only, setOnly] = useState<Lens>('all')
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
   * the tiles follow for a Drone that has never responded: an absence a Teacher can understand
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
  const filterable = state.drones.length >= FILTERABLE_FROM
  const shown = filterable
    ? state.drones.filter((drone) => matches(drone, query, only))
    : state.drones

  return (
    <main
      id="content"
      tabIndex={-1}
      className="flex min-h-full flex-col gap-4 p-4 min-[26rem]:gap-6 min-[26rem]:p-8"
    >
      <ConnectionBanner connection={snapshot.connection} demo={demo} />

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : { duration: 0.55, ease: EASE }}
      >
        <FleetSummary drones={state.drones} />
      </motion.div>

      {/*
       * Filtering, and only once a Fleet is too big to take in at once.
       *
       * Deliberately a filter and never a sort. ADR-0004's rule is that tiles hold their
       * place so a Teacher builds muscle memory for where each Drone is; reordering by
       * battery would destroy exactly that. Hiding some tiles leaves the rest where they
       * were, and the count says plainly that something is hidden.
       *
       * Hidden below `FILTERABLE_FROM` because a classroom set of six is *already* one
       * glance — a search box over six tiles is furniture that costs a Teacher six tab
       * stops before they reach the first Drone, to solve a problem they do not have.
       * Schools that own thirty are the ones this is for.
       */}
      {state.drones.length >= FILTERABLE_FROM && (
        <FleetLens
          query={query}
          onQuery={setQuery}
          lens={only}
          onLens={setOnly}
          showing={shown.length}
          total={state.drones.length}
        />
      )}

      {/*
       * The tile minimum is in rem, so it scales with the type inside it. Left in px it
       * would be the one measurement on the board that ignored large format, and tiles
       * would tighten around their own text exactly when they were meant to open up.
       */}
      <ul className="fleet-grid grid flex-1 list-none content-start gap-4 p-0">
        {shown.map((drone, index) => (
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

      {shown.length === 0 && (
        <p className="m-0 text-body text-ink-muted">
          No Drone matches that. {state.drones.length} are hidden.
        </p>
      )}

      <DroneDetailDialog
        drone={openDrone}
        ageMs={openDrone ? age(openDrone) : null}
        onClose={() => setOpenDroneId(null)}
      />
    </main>
  )
}

/**
 * The Fleet size at which finding a Drone stops being a glance and starts being a search.
 *
 * A classroom set is six to eight and fits on one screen. Past that a Teacher is
 * scanning, and scanning is what the filter exists to replace.
 */
/** The buckets a Teacher actually asks for, in the board's own vocabulary. */
type Lens = 'all' | 'attention' | 'ready' | 'flying' | 'offline'

const LENSES: readonly { id: Lens; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'attention', label: 'Needs attention' },
  { id: 'ready', label: 'Ready' },
  { id: 'flying', label: 'Flying' },
  { id: 'offline', label: 'Offline' },
]

function matches(drone: DroneState, query: string, lens: Lens): boolean {
  const needle = query.trim().toLowerCase()
  if (needle && !drone.name.toLowerCase().includes(needle)) return false

  switch (lens) {
    case 'attention':
      return needsAttention(drone.status)
    case 'ready':
      return drone.status === 'Ready'
    case 'flying':
      return drone.status === 'Flying'
    case 'offline':
      return drone.status === 'Offline'
    case 'all':
      return true
  }
}

function FleetLens({
  query,
  onQuery,
  lens,
  onLens,
  showing,
  total,
}: {
  query: string
  onQuery: (next: string) => void
  lens: Lens
  onLens: (next: Lens) => void
  showing: number
  total: number
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <input
        type="search"
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        placeholder="Find a Drone…"
        aria-label="Find a Drone by name"
        className="min-h-11 min-w-40 flex-1 rounded-pill border border-hairline bg-surface-1 px-4 py-1.5 text-value text-ink"
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Show only">
        {LENSES.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            className={cn(
              'label min-h-11 cursor-pointer rounded-pill border px-3.5 py-1.5 transition-colors',
              candidate.id === lens
                ? 'border-ink bg-ink text-canvas'
                : 'border-hairline text-ink-muted hover:border-ink hover:text-ink',
            )}
            aria-pressed={candidate.id === lens}
            onClick={() => onLens(candidate.id)}
          >
            {candidate.label}
          </button>
        ))}
      </div>

      {/* Says plainly that tiles are missing, so a filtered board is never mistaken
          for a Fleet that has shrunk. */}
      {showing !== total && (
        <p className="tnum m-0 text-value text-ink-subtle" role="status">
          Showing {showing} of {total}
        </p>
      )}
    </div>
  )
}
