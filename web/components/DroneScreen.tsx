'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ageMs, formatAge, formatExactTime } from '@/lib/age'
import { formatBattery, formatTimeToReady } from '@/lib/battery'
import {
  readLogbook,
  readServerLogbook,
  serviceStateOf,
  setServiceState,
  subscribeLogbook,
  writeNote,
  SERVICE_PRESENTATION,
  type ServiceState,
} from '@/lib/logbook'
import { STATUS_PRESENTATION } from '@/lib/status-presentation'
import { faultReason } from '@/lib/telemetry-presentation'
import { cn } from '@/lib/utils'
import { BatteryChart } from './BatteryChart'
import { EventTimeline } from './EventTimeline'
import { useFleet } from './FleetProvider'
import {
  AltitudeAndLanding,
  AttitudeIndicator,
  EmergencyStopNotice,
  InstrumentPanel,
  MotorThrust,
  ObstacleReading,
} from './FlightInstruments'
import { StatusBadge } from './StatusBadge'

/**
 * Everything one Drone is reporting, and everything it has done.
 *
 * The board answers "can I hand this out". This answers the two questions that follow —
 * *why not*, and *is this the one that keeps doing it* — which is why the live readings
 * and the Drone's own history sit on one screen rather than in two places.
 */
export function DroneScreen() {
  const { snapshot, now, demo } = useFleet()
  const droneId = useSearchParams().get('id')
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)

  const state = snapshot.state
  const drone = state?.drones.find((candidate) => candidate.id === droneId) ?? null

  if (!state || snapshot.receivedAt === null) {
    return (
      <main id="content" tabIndex={-1} className="flex flex-col gap-4 p-8">
        <p className="m-0 text-body text-ink-muted">Waiting for the first Fleet State.</p>
      </main>
    )
  }

  if (!drone) {
    return (
      <main id="content" tabIndex={-1} className="flex flex-col gap-4 p-8">
        <h1 className="m-0 font-display text-heading font-medium">No such Drone</h1>
        <p className="m-0 max-w-[46ch] text-body text-ink-muted">
          {droneId
            ? `This Fleet has no Drone with the id ${droneId}. It may have been removed since this link was made.`
            : 'No Drone was named in the address.'}
        </p>
        <Link href="/" className="text-body text-primary underline">
          Back to the Fleet
        </Link>
      </main>
    )
  }

  const telemetry = drone.telemetry
  const age = ageMs(drone, state, snapshot.receivedAt, now)
  const presentation = STATUS_PRESENTATION[drone.status]
  const reason = faultReason(telemetry)
  const events = (snapshot.history?.events ?? []).filter((event) => event.droneId === drone.id)
  const samples = snapshot.history?.batteries.find((entry) => entry.droneId === drone.id)?.samples

  return (
    <main
      id="content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 min-[26rem]:p-8"
    >
      <div className="flex flex-col gap-2">
        {/*
          * A full-height target rather than a 14px strip of text. This is the one way
          * back from a Drone, and it was the smallest tappable thing in the product —
          * on a phone held in one hand at the front of a classroom, a 14px target is a
          * link you miss twice before you hit it.
          */}
        <Link
          href="/"
          className="label inline-flex min-h-11 w-fit items-center text-ink-muted hover:text-ink"
        >
          ← Back to the Fleet
        </Link>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h1 className="m-0 font-display text-summary font-medium">{drone.name}</h1>
          <StatusBadge status={drone.status} />
        </div>
        <p className="m-0 text-body text-ink-muted">{presentation.meaning}</p>
      </div>

      {telemetry && <EmergencyStopNotice telemetry={telemetry} />}

      {reason && !telemetry?.emergencyStopTriggered && (
        <p className="m-0 border-l-2 border-status-fault pl-3 text-body text-ink">{reason}</p>
      )}

      {/* Every value carries its age, here as much as on a tile. */}
      <p
        className={cn('tnum m-0 text-value', drone.stale ? 'italic text-stale' : 'text-ink-subtle')}
        data-stale={drone.stale || undefined}
      >
        {drone.lastContact === null
          ? 'Never heard from'
          : `Heard from ${formatAge(age ?? 0)} · ${formatExactTime(drone.lastContact)}`}
        {drone.stale && ' — these are last known values, not current ones.'}
      </p>

      {telemetry ? (
        <div className="grid gap-4 md:grid-cols-2">
          <InstrumentPanel label="Charge">
            <div className="flex items-baseline gap-3">
              <span className="tnum font-display text-summary font-medium">
                {telemetry.batteryIsEstimate ? '~' : ''}
                {formatBattery(telemetry.batteryFraction)}
              </span>
              {telemetry.batteryIsEstimate && (
                <span className="text-value text-ink-subtle">
                  estimated — this airframe cannot measure charge precisely
                </span>
              )}
            </div>
            {drone.timeToReadyMs !== null && (
              <p className="tnum m-0 text-value text-status-not-ready">
                {formatTimeToReady(drone.timeToReadyMs)}
              </p>
            )}
            <BatteryChart
              samples={samples ?? []}
              since={snapshot.history?.since ?? state.generatedAt}
              until={state.generatedAt}
            />
          </InstrumentPanel>

          <InstrumentPanel label="Height and landing">
            <AltitudeAndLanding telemetry={telemetry} />
          </InstrumentPanel>

          {telemetry.orientation && (
            <InstrumentPanel label="How it is sitting">
              <AttitudeIndicator orientation={telemetry.orientation} />
            </InstrumentPanel>
          )}

          <InstrumentPanel label="Motors">
            <MotorThrust motors={telemetry.motors ?? []} />
          </InstrumentPanel>

          <InstrumentPanel label="Obstacles">
            <ObstacleReading telemetry={telemetry} />
          </InstrumentPanel>

          <InstrumentPanel label="Everything else reported">
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              <dt className="label self-center">Linked with</dt>
              <dd className="m-0 text-value">
                {telemetry.linkGroupId
                  ? `Group ${telemetry.linkGroupId}`
                  : 'Flying on its own'}
              </dd>
              {Object.entries(telemetry.extra ?? {}).map(([key, value]) => (
                <Reading key={key} name={key} value={String(value)} />
              ))}
            </dl>
          </InstrumentPanel>
        </div>
      ) : (
        <p className="m-0 text-body text-ink-muted">
          Nothing has ever been heard from this Drone, so there is nothing to show. This is
          a Drone the School owns, not a failed one.
        </p>
      )}

      <ServicePanel droneId={drone.id} state={serviceStateOf(book, drone.id)} demo={demo} />
      <NotePanel droneId={drone.id} text={book.notes[drone.id]?.text ?? ''} />

      <section className="flex flex-col gap-3">
        <h2 className="label m-0">What this Drone has done</h2>
        <EventTimeline
          events={events}
          now={now}
          emptyMessage="Nothing has happened to this Drone in the window the ground station keeps."
        />
      </section>
    </main>
  )
}

function Reading({ name, value }: { name: string; value: string }) {
  const spaced = name.replace(/([A-Z])/g, ' $1').trim()
  return (
    <>
      <dt className="label self-center">
        {spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase()}
      </dt>
      <dd className="tnum m-0 text-value">{value}</dd>
    </>
  )
}

/**
 * The Teacher's own decision about this Drone.
 *
 * Kept firmly apart from Status. Status is derived from Telemetry and belongs to the
 * ground station; this is a person deciding a Drone should stop being handed out, which
 * no aircraft can report about itself. Conflating the two would let a Drone that is
 * electrically fine quietly overrule a Teacher who has decided otherwise.
 */
function ServicePanel({
  droneId,
  state,
  demo,
}: {
  droneId: string
  state: ServiceState
  demo: boolean
}) {
  return (
    <section className="flex flex-col gap-3 rounded-surface border border-hairline bg-surface-1 p-4">
      <h2 className="label m-0">Your decision about this Drone</h2>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(SERVICE_PRESENTATION) as ServiceState[]).map((candidate) => (
          <button
            key={candidate}
            type="button"
            className={cn(
              'label min-h-11 cursor-pointer rounded-pill border px-3.5 py-1.5 transition-colors',
              candidate === state
                ? 'border-ink bg-ink text-canvas'
                : 'border-hairline text-ink-muted hover:border-ink hover:text-ink',
            )}
            aria-pressed={candidate === state}
            onClick={() => setServiceState(droneId, candidate, '', Date.now())}
          >
            {SERVICE_PRESENTATION[candidate].label}
          </button>
        ))}
      </div>
      <p className="m-0 text-value text-ink-subtle">{SERVICE_PRESENTATION[state].meaning}</p>
      {demo && (
        <p className="m-0 text-value text-ink-subtle">
          This is saved in this browser. On the demonstration Fleet it is yours to play
          with and affects nothing real.
        </p>
      )}
    </section>
  )
}

function NotePanel({ droneId, text }: { droneId: string; text: string }) {
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? text

  return (
    <section className="flex flex-col gap-2">
      <label className="label" htmlFor={`note-${droneId}`}>
        Your note
      </label>
      <textarea
        id={`note-${droneId}`}
        value={value}
        rows={3}
        placeholder="Anything worth remembering about this one — a loose arm, a sticky button…"
        className="rounded-surface border border-hairline bg-surface-1 p-3 text-value text-ink"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft !== null) writeNote(droneId, draft, Date.now())
          setDraft(null)
        }}
      />
      <p className="m-0 text-value text-ink-subtle">Saved when you click away.</p>
    </section>
  )
}
