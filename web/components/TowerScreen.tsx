'use client'

import { useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { alertQueue, AltitudeTracker, fleetVitals, type DroneVitals } from '@/lib/vitals'
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
import { FormationMap } from './FormationMap'
import { useFleet } from './FleetProvider'

/**
 * The tower: the whole lesson at once, the way a controller reads a sector.
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
export function TowerScreen() {
  const { snapshot, now } = useFleet()
  const tracker = useRef<AltitudeTracker | null>(null)
  tracker.current ??= new AltitudeTracker()

  const state = snapshot.state

  /*
   * Altitude has to be remembered across snapshots to become a rate, and the ground
   * station does not send a history of it the way it does for charge. Observing during
   * the effect rather than during render keeps a re-render from recording a reading
   * twice — the tracker rejects repeats of the same contact moment anyway, but two
   * sources of truth about when a sample was taken is a bug waiting to be written.
   */
  useEffect(() => {
    if (state) tracker.current?.observe(state)
  }, [state])

  const vitals = useMemo(() => {
    if (!state || snapshot.receivedAt === null) return []
    return fleetVitals({
      state,
      receivedAt: snapshot.receivedAt,
      now,
      batteries: snapshot.history?.batteries ?? [],
      rates: tracker.current?.rates() ?? new Map(),
    })
  }, [state, snapshot.receivedAt, snapshot.history, now])

  const queue = useMemo(() => alertQueue(vitals), [vitals])

  if (!state) {
    return (
      <main id="content" tabIndex={-1} className="p-8">
        <p className="m-0 text-body text-ink-muted">Waiting for the first Fleet State.</p>
      </main>
    )
  }

  // Worst first, then by callsign, so a Drone in trouble rises without the list
  // reshuffling every second for Drones that are all equally fine.
  const strips = [...vitals].sort((a, b) => {
    const rank = (entry: DroneVitals) =>
      entry.alerts[0] === undefined
        ? 3
        : { critical: 0, warning: 1, info: 2 }[entry.alerts[0].severity]
    return rank(a) - rank(b) || a.callsign.localeCompare(b.callsign)
  })

  const worst = queue[0]

  return (
    <main
      id="content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 min-[26rem]:p-8"
    >
      <section className="flex flex-col gap-2">
        <h1 className="m-0 flex items-baseline gap-3 font-display text-summary font-medium">
          <span className="tnum tracking-[-0.02em]">{queue.length}</span>
          <span className="text-heading text-ink-subtle">
            {queue.length === 1 ? 'thing needs you' : 'things need you'}
          </span>
        </h1>

        {worst === undefined ? (
          <p className="m-0 text-body text-ink-muted">
            Nothing needs you. Every Drone in contact is behaving.
          </p>
        ) : (
          <p
            className={cn(
              'm-0 border-l-2 pl-3 text-body text-ink',
              SEVERITY_PRESENTATION[worst.severity].className,
            )}
          >
            <strong className="font-medium">{worst.callsign}</strong> — {worst.text}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="label m-0">Where everything is</h2>
        <FormationMap drones={state.drones} vitals={vitals} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="label m-0">Every Drone</h2>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {strips.map((entry) => (
            <FlightStrip key={entry.droneId} vitals={entry} />
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
function FlightStrip({ vitals }: { vitals: DroneVitals }) {
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
        <Link
          href={`/drone?id=${encodeURIComponent(vitals.droneId)}`}
          className="tap-row font-display text-body font-medium text-ink no-underline hover:underline"
        >
          {vitals.callsign}
        </Link>
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
