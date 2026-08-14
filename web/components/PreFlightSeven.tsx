'use client'

import { useEffect, useState } from 'react'
import type { DroneId, FleetThresholds, Telemetry } from '@techtechflight/contract'
import { DEFAULT_THRESHOLDS } from '@techtechflight/contract'
import {
  evaluatePreFlightSeven,
  preFlightSevenDoneCount,
  preFlightSevenStatusWord,
  PRE_FLIGHT_SEVEN_ITEMS,
  propellersTicked,
  readPreFlightSeven,
  subscribePreFlightSeven,
  togglePropellersTick,
  type PreFlightSevenReading,
  type PreFlightSevenState,
} from '@/lib/preflight-seven'
import { cn } from '@/lib/utils'

/**
 * Seven-item pre-flight check for one craft — six from Telemetry, propellers by hand.
 *
 * Fixed item order; rows never reorder when status changes (DELIBERATE-POSITIONS 1).
 * Word and shape carry pass/fail (ADR-0004). Mount with Lesson id and live Telemetry.
 */
export function PreFlightSeven({
  droneId,
  lessonId,
  telemetry,
  thresholds = DEFAULT_THRESHOLDS,
}: {
  readonly droneId: DroneId
  readonly lessonId: string | null
  readonly telemetry: Telemetry | null
  readonly thresholds?: FleetThresholds
}) {
  const [state, setState] = useState<PreFlightSevenState>(() => readPreFlightSeven(lessonId))

  /*
   * Subscribed, not read once. The tick-all above these panels writes for every craft at
   * once, and a panel that only read on mount kept saying the propellers were unchecked after
   * the Teacher had said they were.
   */
  useEffect(() => {
    setState(readPreFlightSeven(lessonId))
    return subscribePreFlightSeven(() => setState(readPreFlightSeven(lessonId)))
  }, [lessonId])

  const readings = evaluatePreFlightSeven(
    telemetry,
    propellersTicked(state, droneId),
    thresholds,
  )
  const done = preFlightSevenDoneCount(readings)
  const total = PRE_FLIGHT_SEVEN_ITEMS.length

  return (
    <section
      className="flex flex-col gap-4 rounded-surface border border-hairline bg-surface-1 p-5"
      aria-labelledby="preflight-seven-heading"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div className="flex flex-col gap-1">
          <h2 id="preflight-seven-heading" className="label m-0">
            Pre-flight check
          </h2>
          <p className="m-0 text-value text-ink-subtle">
            Seven items before takeoff. Propellers is the only one you tick; the rest read
            from Telemetry.
          </p>
        </div>
        <p className="m-0 text-value text-ink-subtle" role="status">
          <span className="tnum">{done}</span>
          {' of '}
          <span className="tnum">{total}</span>
          {' OK'}
        </p>
      </div>

      {!lessonId ? (
        <p className="m-0 text-value text-ink-muted">
          Start a Lesson to keep the propeller tick for this period. Telemetry items still
          update live.
        </p>
      ) : null}

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {readings.map((item) =>
          item.manual ? (
            <PreFlightSevenRow
              key={item.id}
              item={item}
              onToggle={() => setState(togglePropellersTick(lessonId, droneId))}
            />
          ) : (
            <PreFlightSevenRow key={item.id} item={item} />
          ),
        )}
      </ul>
    </section>
  )
}

function PreFlightSevenRow({
  item,
  onToggle,
}: {
  readonly item: PreFlightSevenReading
  readonly onToggle?: () => void
}) {
  const statusWord = preFlightSevenStatusWord(item.status)
  const checked = item.status === 'pass'

  if (item.manual && onToggle) {
    return (
      <li>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={checked}
          className={cn(
            'flex w-full min-h-11 cursor-pointer items-start gap-3 rounded-sm border border-hairline bg-canvas px-3 py-2 text-left text-ink',
            'hover:border-ink-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
          )}
        >
          <PreFlightSevenMark checked={checked} pending={item.status === 'pending'} />
          <PreFlightSevenCopy item={item} statusWord={statusWord} />
        </button>
      </li>
    )
  }

  return (
    <li
      className="flex min-h-11 items-start gap-3 rounded-sm border border-hairline bg-canvas px-3 py-2"
      aria-label={`${item.label}: ${statusWord}`}
    >
      <PreFlightSevenMark
        checked={checked}
        pending={false}
        failed={item.status === 'fail'}
        muted={item.status === 'unreportable'}
      />
      <PreFlightSevenCopy item={item} statusWord={statusWord} />
    </li>
  )
}

function PreFlightSevenMark({
  checked,
  pending,
  failed = false,
  muted = false,
}: {
  readonly checked: boolean
  readonly pending: boolean
  readonly failed?: boolean
  readonly muted?: boolean
}) {
  return (
    <span
      className={cn(
        'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm border text-caption',
        checked
          ? 'border-ink bg-ink text-canvas'
          : failed
            ? 'border-status-not-ready bg-transparent text-status-not-ready'
            : muted
              ? 'border-hairline bg-transparent text-ink-muted'
              : pending
                ? 'border-hairline bg-transparent text-transparent'
                : 'border-hairline bg-transparent text-ink-muted',
      )}
      aria-hidden="true"
    >
      {checked ? '✓' : failed ? '!' : pending ? '·' : '-'}
    </span>
  )
}

function PreFlightSevenCopy({
  item,
  statusWord,
}: {
  readonly item: PreFlightSevenReading
  readonly statusWord: string
}) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="font-display text-value font-medium text-ink">{item.label}</span>
      <span className="text-caption text-ink-muted">{item.detail}</span>
      <span className="text-caption text-ink-subtle">{statusWord}</span>
    </span>
  )
}
