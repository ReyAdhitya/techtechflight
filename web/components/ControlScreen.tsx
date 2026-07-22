'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import {
  assignPilot,
  clearPilots,
  pilotOf,
  readLogbook,
  readServerLogbook,
  subscribeLogbook,
} from '@/lib/logbook'
import { alertQueue, compareStrips, type DroneVitals } from '@/lib/vitals'
import {
  formatEndurance,
  formatSeparation,
  formatVerticalMovement,
  PHASE_PRESENTATION,
  SEVERITY_PRESENTATION,
} from '@/lib/vitals-presentation'
import { formatAge } from '@/lib/age'
import { formatBattery } from '@/lib/battery'
import { cn } from '@/lib/utils'
import { AttentionBar } from './AttentionBar'
import { FormationMap } from './FormationMap'
import { useFleet } from './FleetProvider'

/**
 * The Flight Control Center: the whole lesson at once, the way a controller reads a
 * sector.
 *
 * The Fleet board answers "can I hand this out" and is built to be glanced at. This is
 * built to be watched. The difference is that everything here says what to do next
 * rather than what is true — a controller does not need to be told a Drone is at 0.4m
 * and falling, they need to be told which aircraft needs them first.
 *
 * Order is deliberate and fixed: what needs you, then where everything is, then the
 * detail. A Teacher who looks up for two seconds should get the answer from the first
 * line without reading the rest.
 */
export function ControlScreen() {
  const { snapshot, vitals } = useFleet()
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)

  const state = snapshot.state
  const queue = useMemo(() => alertQueue(vitals), [vitals])

  if (!state) {
    return (
      <main id="content" tabIndex={-1} className="p-8">
        <p className="m-0 text-body text-ink-muted">Waiting for the first Fleet State.</p>
      </main>
    )
  }

  // Worst first, and among equals the one with more of them. Drone Name breaks the final
  // tie so a Fleet where nothing is wrong holds a stable order rather than reshuffling.
  const strips = [...vitals].sort(compareStrips)

  return (
    <main
      id="content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 min-[26rem]:p-8"
    >
      <AttentionBar queue={queue} studentFor={(droneId) => pilotOf(book, droneId)} />

      <section className="flex flex-col gap-3">
        <h2 className="label m-0">Where everything is</h2>
        <FormationMap drones={state.drones} vitals={vitals} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="label m-0">Every Drone</h2>
          {Object.keys(book.pilots).length > 0 && (
            <button
              type="button"
              onClick={clearPilots}
              className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted hover:border-ink hover:text-ink"
            >
              Everyone has put theirs down
            </button>
          )}
        </div>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {strips.map((entry) => (
            <FlightStrip key={entry.droneId} vitals={entry} pilot={pilotOf(book, entry.droneId)} />
          ))}
        </ul>
      </section>
    </main>
  )
}

/**
 * One aircraft, one row.
 *
 * A strip is not a tile. A tile answers "what is this"; a strip answers "what is this
 * doing and how long have I got", which is why height carries its direction and charge
 * carries a time rather than only a percentage.
 */
/**
 * Who is flying this one.
 *
 * Edited in place rather than behind a dialog: a Teacher assigns six of these in the
 * thirty seconds before a lesson starts, and six dialogs is not thirty seconds. Held in
 * local state while being typed so the Logbook is not rewritten on every keystroke.
 */
function PilotField({
  droneId,
  callsign,
  pilot,
}: {
  droneId: string
  callsign: string
  pilot: string | null
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? pilot ?? ''

  return (
    <label className="flex items-center">
      <span className="visually-hidden">Who is flying {callsign}</span>
      <input
        value={value}
        placeholder="Add a name"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft !== null) assignPilot(droneId, draft)
          setDraft(null)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
        className={cn(
          'min-h-11 w-28 rounded-pill border bg-canvas px-3 py-1 text-value',
          pilot ? 'border-hairline text-ink' : 'border-dashed border-hairline text-ink-muted',
        )}
      />
    </label>
  )
}

function FlightStrip({ vitals, pilot }: { vitals: DroneVitals; pilot: string | null }) {
  const phase = PHASE_PRESENTATION[vitals.phase]
  const separation = formatSeparation(vitals)

  return (
    <li
      className={cn(
        'flex flex-col gap-2 rounded-surface border-l-2 bg-surface-1 p-3',
        vitals.alerts[0]
          ? SEVERITY_PRESENTATION[vitals.alerts[0].severity].className
          : 'border-hairline',
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {/*
          * Real height rather than the tap-row overlay used in Maintenance. A strip wraps
          * its alerts onto following lines, and those lines paint over an expanded hit
          * area, leaving the bottom half of the target unclickable. Here the row is tall
          * enough to carry a full-height link without moving anything.
          */}
        <Link
          href={`/drone?id=${encodeURIComponent(vitals.droneId)}`}
          className="inline-flex min-h-11 items-center font-display text-body font-medium text-ink no-underline hover:underline"
        >
          {vitals.callsign}
        </Link>
        <PilotField droneId={vitals.droneId} callsign={vitals.callsign} pilot={pilot} />
        <span className="text-value text-ink">{phase.label}</span>
        <span className="tnum text-value text-ink-subtle">{formatVerticalMovement(vitals)}</span>
        <span className="tnum text-value text-ink-subtle">
          {vitals.batteryFraction === null
            ? 'Charge unknown'
            : `${formatBattery(vitals.batteryFraction)} · ${formatEndurance(vitals.enduranceMs)}`}
        </span>
        <span className="tnum ml-auto text-value text-ink-muted">
          {vitals.responseAgeMs === null
            ? 'No response yet'
            : `Response ${formatAge(vitals.responseAgeMs)}`}
        </span>
      </div>

      {separation && (
        <p className="m-0 tnum text-value text-ink-subtle">Nearest aircraft: {separation}</p>
      )}

      {vitals.alerts.length > 0 && pilot && (
        // Repeated under the alerts on purpose. The alert is the thing being read, and
        // "go and speak to Priya" is more use than "go and look at Drone 3".
        <p className="m-0 text-value text-ink-subtle">Flown by {pilot}.</p>
      )}

      {vitals.alerts.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {vitals.alerts.map((alert) => (
            <li key={alert.kind} className="flex flex-wrap items-baseline gap-2">
              <span
                className={cn(
                  'label rounded-pill border px-2 py-0.5',
                  SEVERITY_PRESENTATION[alert.severity].className,
                )}
              >
                {SEVERITY_PRESENTATION[alert.severity].label}
              </span>
              <span className="text-value text-ink">{alert.text}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
