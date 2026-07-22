'use client'

import { useMemo, useSyncExternalStore } from 'react'
import Link from 'next/link'
import type { DroneState, FleetEvent } from '@techtechflight/contract'
import { needsAttention } from '@techtechflight/contract'
import { formatBattery } from '@/lib/battery'
import {
  alreadyTallied,
  EMPTY_TALLY,
  persistedTally,
  readLogbook,
  readServerLogbook,
  serviceStateOf,
  setServiceState,
  subscribeLogbook,
  talliedLessonCount,
  talliedWindows,
  tallyEvents,
  SERVICE_PRESENTATION,
  type Logbook,
  type ServiceState,
} from '@/lib/logbook'
import { STATUS_PRESENTATION } from '@/lib/status-presentation'
import { faultReason } from '@/lib/telemetry-presentation'
import { cn } from '@/lib/utils'
import { useFleet } from './FleetProvider'
import { StatusGlyph } from './StatusBadge'

/**
 * What needs doing, and which Drone keeps needing it.
 *
 * Two different questions, deliberately on one screen. The top half is this morning —
 * plug that one in, set that one aside. The bottom half is the pattern across the whole
 * retained window, which is the only thing that distinguishes a Drone having a bad day
 * from a Drone that should go back to the supplier.
 */
export function MaintenanceScreen() {
  const { snapshot, now } = useFleet()
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)
  const drones = snapshot.state?.drones ?? []
  const events = snapshot.history?.events ?? []

  const reliability = useMemo(() => rank(drones, events, book), [drones, events, book])
  const todo = drones.filter((drone) => needsAttention(drone.status))
  const lessonsCounted = talliedLessonCount(book)

  if (!snapshot.state) {
    return (
      <main id="content" tabIndex={-1} className="p-8">
        <p className="m-0 text-body text-ink-muted">Waiting for the first Fleet State.</p>
      </main>
    )
  }

  return (
    <main
      id="content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-4 min-[26rem]:p-8"
    >
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 flex items-baseline gap-3 font-display text-summary font-medium">
            <span className="tnum tracking-[-0.02em]">{todo.length}</span>
            <span className="text-heading text-ink-subtle">
              {todo.length === 1 ? 'thing needs doing' : 'things need doing'}
            </span>
          </h1>
          {todo.length === 0 && (
            <p className="m-0 text-body text-ink-muted">
              Nothing in the Fleet needs attention right now.
            </p>
          )}
        </div>

        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {todo.map((drone) => (
            <li
              key={drone.id}
              className={cn(
                'flex flex-col gap-2 rounded-surface border-l-2 bg-surface-1 p-4',
                drone.status === 'Fault' ? 'border-status-fault' : 'border-status-not-ready',
              )}
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Link
                  href={`/drone?id=${encodeURIComponent(drone.id)}`}
                  className="tap-row font-display text-body font-medium text-ink no-underline hover:underline"
                >
                  {drone.name}
                </Link>
                <span
                  className={cn(
                    'inline-flex items-center gap-2 text-value',
                    drone.status === 'Fault' ? 'text-status-fault' : 'text-status-not-ready',
                  )}
                >
                  <StatusGlyph shape={STATUS_PRESENTATION[drone.status].shape} />
                  {STATUS_PRESENTATION[drone.status].label}
                </span>
                {drone.telemetry && (
                  <span className="tnum text-value text-ink-subtle">
                    {formatBattery(drone.telemetry.batteryFraction)}
                  </span>
                )}
              </div>

              {/* What to actually do, rather than a restatement of the Status. */}
              <p className="m-0 text-value text-ink">
                {drone.status === 'Not Ready'
                  ? 'Put it on charge. It should be back before the lesson.'
                  : (faultReason(drone.telemetry) ??
                    'Take it out of service until someone has looked at it.')}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4 border-t border-hairline pt-6">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 font-display text-heading font-medium">
            Which Drones keep giving trouble
          </h2>
          <p className="m-0 max-w-[60ch] text-value text-ink-subtle">
            {lessonsCounted === 0
              ? `Counted across everything the ground station still remembers. A Drone with
                 one fault had a bad morning; a Drone at the top of this list every week is
                 one to take up with the supplier.`
              : `Counted across everything the ground station still remembers, plus
                 ${lessonsCounted} finished ${lessonsCounted === 1 ? 'lesson' : 'lessons'}
                 kept on this laptop. A Drone with one fault had a bad morning; a Drone at
                 the top of this list every week is one to take up with the supplier.`}
          </p>
        </div>

        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {reliability.map((entry) => {
            const state = serviceStateOf(book, entry.drone.id)
            return (
              <li
                key={entry.drone.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-surface border border-hairline bg-surface-1 p-3"
              >
                <Link
                  href={`/drone?id=${encodeURIComponent(entry.drone.id)}`}
                  className="tap-row font-display text-body font-medium text-ink no-underline hover:underline"
                >
                  {entry.drone.name}
                </Link>

                <span className="tnum text-value text-ink-muted">
                  {entry.faults} {entry.faults === 1 ? 'fault' : 'faults'}
                </span>
                <span className="tnum text-value text-ink-subtle">
                  {entry.dropouts} {entry.dropouts === 1 ? 'dropout' : 'dropouts'}
                </span>
                <span className="tnum text-value text-ink-subtle">
                  {entry.flights} {entry.flights === 1 ? 'flight' : 'flights'}
                </span>

                <label className="ml-auto flex items-center gap-2">
                  <span className="visually-hidden">Service state for {entry.drone.name}</span>
                  <select
                    value={state}
                    onChange={(event) =>
                      setServiceState(
                        entry.drone.id,
                        event.target.value as ServiceState,
                        '',
                        now || Date.now(),
                      )
                    }
                    className={cn(
                      'min-h-11 rounded-pill border bg-canvas px-3 py-1.5 text-value',
                      state === 'out-of-service'
                        ? 'border-status-fault text-status-fault'
                        : state === 'watch'
                          ? 'border-status-not-ready text-status-not-ready'
                          : 'border-hairline text-ink-muted',
                    )}
                  >
                    {(Object.keys(SERVICE_PRESENTATION) as ServiceState[]).map((candidate) => (
                      <option key={candidate} value={candidate}>
                        {SERVICE_PRESENTATION[candidate].label}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}

interface Reliability {
  readonly drone: DroneState
  readonly faults: number
  readonly dropouts: number
  readonly flights: number
}

/**
 * Worst first, so the Drone worth arguing about is at the top.
 *
 * Two sources, because neither alone answers the question. The ground station's history
 * is complete but short — restart it and every Drone looks blameless. The Teacher's saved
 * lessons go back a term but stop at the last one that was closed. A live event that falls
 * inside a lesson already tallied is dropped rather than added, or the overlap between the
 * two would be counted twice.
 */
function rank(
  drones: readonly DroneState[],
  events: readonly FleetEvent[],
  book: Logbook,
): readonly Reliability[] {
  const saved = persistedTally(book)
  const windows = talliedWindows(book)
  const live = tallyEvents(events.filter((event) => !alreadyTallied(windows, event.at)))

  return drones
    .map((drone) => {
      const before = saved[drone.id] ?? EMPTY_TALLY
      const now = live[drone.id] ?? EMPTY_TALLY
      return {
        drone,
        faults: before.faults + now.faults,
        dropouts: before.dropouts + now.dropouts,
        flights: before.flights + now.flights,
      }
    })
    .sort((a, b) => b.faults - a.faults || b.dropouts - a.dropouts)
}
