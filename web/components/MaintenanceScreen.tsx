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
/**
 * What needs doing to the Fleet this morning.
 *
 * A question about the Drones right now, which is what the Fleet screen is for — so it
 * lives there. It was on Maintenance beside a question about the past, and the Maintenance
 * screen's own comment called those "two different questions, deliberately on one screen".
 * That was true, and it is exactly why they separate cleanly.
 */
export function WhatNeedsDoing() {
  const { snapshot, now } = useFleet()
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)
  const drones = snapshot.state?.drones ?? []
  const todo = drones.filter((drone) => needsAttention(drone.status))

  if (!snapshot.state) return null

  return (
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 flex items-baseline gap-3 font-display text-summary font-medium">
            <span className="tnum tracking-[-0.02em]">{todo.length}</span>
            <span className="text-heading text-ink-subtle">
              {todo.length === 1 ? 'item requires action' : 'items require action'}
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
                  prefetch={false}
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
                  ? 'Place on charge. Projected serviceable before the lesson.'
                  : (faultReason(drone.telemetry) ??
                    'Withdraw from service. Pending inspection.')}
              </p>
            </li>
          ))}
        </ul>
      </section>
  )
}

/**
 * Which Drone keeps giving trouble, across everything still remembered.
 *
 * A question about the past, so it belongs with the other questions about the past. This
 * is the number a Teacher takes to the supplier, which is why it must not be inflated by
 * counting the same fault from the live history and from a saved Lesson.
 */
export function FleetReliability() {
  const { snapshot, now } = useFleet()
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)
  const drones = snapshot.state?.drones ?? []
  const events = snapshot.history?.events ?? []

  const reliability = useMemo(() => rank(drones, events, book), [drones, events, book])
  const lessonsCounted = talliedLessonCount(book)

  return (
      <section className="flex flex-col gap-4 ">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 font-display text-heading font-medium">
            Recurring defects by Drone
          </h2>
          {/*
           * No measure cap. The Drone cards directly beneath span the column, and a caption
           * that stops halfway reads as something that ran out rather than as a decision.
           * The 45-75 character measure is a rule for long-form reading; this is three
           * sentences above the thing they describe, and the eye never travels far enough
           * for it to earn its keep against the misalignment it costs.
           */}
          <p className="m-0 text-value text-ink-subtle">
            {lessonsCounted === 0
              ? `Counted across everything the ground station still holds. A single fault is
                 an isolated occurrence; a Drone at the top of this list week after week is
                 one to raise with the supplier.`
              : `Counted across everything the ground station still holds, plus
                 ${lessonsCounted} completed ${lessonsCounted === 1 ? 'lesson' : 'lessons'}
                 retained on this laptop. A single fault is an isolated occurrence; a Drone
                 at the top of this list week after week is one to raise with the supplier.`}
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
                  prefetch={false}
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

                <label className="print-hide ml-auto flex items-center gap-2">
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
  )
}

interface Reliability {
  readonly drone: DroneState
  readonly faults: number
  readonly dropouts: number
  readonly flights: number
}

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
