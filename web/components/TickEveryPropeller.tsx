'use client'

import { useEffect, useState } from 'react'
import type { DroneId } from '@techtechflight/contract'
import {
  propellersTicked,
  readPreFlightSeven,
  tickAllPropellers,
  type PreFlightSevenState,
} from '@/lib/preflight-seven'

/**
 * Tick Propellers on every craft in the Lesson, in one press.
 *
 * Six of the seven pre-flight items read themselves from Telemetry. Propellers is the only
 * human tick, because the board cannot see a chipped blade — and the tedium was never looking
 * at a propeller, it was doing the same tick once per aircraft down a column of panels. A
 * Teacher walks the bench with their eyes and then says so once, which is the shape of the job
 * they are actually doing.
 *
 * It goes away when there is nothing left to tick, rather than sitting there greyed out: a
 * button that cannot do anything is a button a Teacher reads on every visit to this step.
 */
export function TickEveryPropeller({
  lessonId,
  droneIds,
}: {
  readonly lessonId: string | null
  readonly droneIds: readonly DroneId[]
}) {
  const [state, setState] = useState<PreFlightSevenState>(() => readPreFlightSeven(lessonId))

  useEffect(() => {
    setState(readPreFlightSeven(lessonId))
  }, [lessonId])

  const left = droneIds.filter((droneId) => !propellersTicked(state, droneId))
  if (left.length === 0) return null

  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
      <button
        type="button"
        onClick={() => setState(tickAllPropellers(lessonId, droneIds))}
        className="min-h-11 cursor-pointer rounded-pill border-0 bg-ink px-4 py-1.5 text-value font-medium text-canvas"
      >
        Propellers checked on all <span className="tnum">{droneIds.length}</span>
      </button>
      <p className="m-0 text-value text-ink-subtle">
        Walk the bench, then tick once. <span className="tnum">{left.length}</span>
        {left.length === 1 ? ' still to tick.' : ' still to tick.'}
      </p>
    </div>
  )
}
