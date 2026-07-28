'use client'

import { useMemo, useState } from 'react'
import type { EventSeverity } from '@techtechflight/contract'
import { formatDuration } from '@/lib/age'
import { formatClock } from '@/lib/telemetry-presentation'
import { cn } from '@/lib/utils'
import { EventTimeline } from './EventTimeline'
import { Scope } from './Scope'
import { useFleet } from './FleetProvider'

type Lens = 'everything' | 'attention' | 'faults'

/**
 * The timeline, as a section of Reports rather than a screen of its own.
 *
 * Kept whole: every filter and every behaviour moved with it. This is a relocation, not a
 * rewrite, and the questions it answers — "when did we lose it", "did that Drone do it
 * again" — are the ones the board is structurally incapable of answering.
 */
export function HistorySections() {
  const { snapshot, now } = useFleet()
  const [lens, setLens] = useState<Lens>('everything')
  const [droneId, setDroneId] = useState<string>('')

  const history = snapshot.history
  const drones = snapshot.state?.drones ?? []

  const events = useMemo(() => {
    const all = history?.events ?? []
    return all.filter((event) => {
      if (droneId && event.droneId !== droneId) return false
      if (lens === 'faults') return event.severity === 'fault'
      if (lens === 'attention') return event.severity !== 'routine'
      return true
    })
  }, [history, lens, droneId])

  const counts = useMemo(() => {
    const all = history?.events ?? []
    return {
      total: all.length,
      attention: all.filter((event) => event.severity !== 'routine').length,
      faults: all.filter((event) => event.severity === 'fault').length,
    }
  }, [history])

  if (!history) {
    return (
      <section className="flex flex-col gap-2">
        <h2 className="m-0 font-display text-heading font-medium">No history yet</h2>
        <p className="m-0 mt-2 max-w-[52ch] text-body text-ink-muted">
          This ground station has not sent a record of the recent past. The board shows
          what is true now; a timeline needs a ground station that has been running long
          enough to have watched something happen.
        </p>
      </section>
    )
  }

  const window = Math.max(0, (snapshot.state?.generatedAt ?? now) - history.since)

  return (
    <>
      <div className="flex flex-col gap-1">
        <h2 className="m-0 flex items-baseline gap-3 font-display text-heading font-medium">
          <span className="tnum tracking-[-0.02em]">{counts.total}</span>
          <span className="text-ink-subtle">things happened</span>
        </h2>
        {/*
         * The window is stated rather than implied. The ground station keeps a bounded
         * record, and a timeline that quietly began at the oldest thing it still had
         * would let a Teacher read "no faults" as "no faults ever".
         */}
        <p className="tnum m-0 text-value text-ink-subtle">
          Covering the last {formatDuration(window)} — since{' '}
          {formatClock(history.since)}. Anything older has been discarded.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Show only">
          {(
            [
              ['everything', `Everything (${counts.total})`],
              ['attention', `Needed attention (${counts.attention})`],
              ['faults', `Faults (${counts.faults})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={cn(
                'label min-h-11 cursor-pointer rounded-pill border px-3.5 py-1.5 transition-colors',
                id === lens
                  ? 'border-ink bg-ink text-canvas'
                  : 'border-hairline text-ink-muted hover:border-ink hover:text-ink',
              )}
              aria-pressed={id === lens}
              onClick={() => setLens(id as Lens)}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          value={droneId}
          onChange={(event) => setDroneId(event.target.value)}
          aria-label="Show only one Drone"
          className="min-h-11 rounded-pill border border-hairline bg-surface-1 px-4 py-1.5 text-value text-ink"
        >
          <option value="">Every Drone</option>
          {drones.map((drone) => (
            <option key={drone.id} value={drone.id}>
              {drone.name}
            </option>
          ))}
        </select>
      </div>

      <EventTimeline
        events={events}
        now={now}
        emptyMessage="Nothing matching that has happened in the window the ground station keeps."
      />

      <section className="flex flex-col gap-3 border-t border-hairline pt-6">
        <h2 className="label m-0">Where the Fleet is now</h2>
        <Scope drones={drones} />
      </section>
    </>
  )
}
