'use client'

import { useEffect } from 'react'
import type { DroneId } from '@techtechflight/contract'
import {
  awaitingClearance,
  grantClearance,
  holdClearance,
  syncClearanceQueue,
  type ClearanceCraftInput,
  type ClearanceRequest,
  type ClearanceState,
} from '@/lib/clearance'
import { cn } from '@/lib/utils'

/**
 * The clearance queue — craft that entered *Awaiting clearance* on their own (ADR-0021).
 *
 * The Teacher grants or holds; nothing reaches the ground station. Both are records
 * addressed to a person. Mounting stays with the Integrator; this panel takes state and
 * craft rows so it can render under the Mission run without owning subscriptions. The count
 * stays visible at zero (DELIBERATE-POSITIONS 3).
 *
 * A held team stays in the queue and reads as held. Sending it away would make the Teacher's
 * own answer invisible to them, and leaving it reading "waiting" would make a team they
 * deliberately kept on the ground look like one nobody had reached yet.
 */

export interface ClearanceQueueCraft {
  readonly input: ClearanceCraftInput
  readonly droneName: string
  readonly teamName: string | null
  readonly studentName: string | null
}

/** Empty copy — the queue vanishing would look like a layout bug, not information. */
export const CLEARANCE_QUEUE_EMPTY =
  'Nobody is awaiting clearance. Teams enter the queue when Ready, assigned and past pre-flight.'

function craftLabel(entry: ClearanceQueueCraft): string {
  return entry.teamName ?? entry.droneName
}

function lookupCraft(
  craft: readonly ClearanceQueueCraft[],
  droneId: DroneId,
): ClearanceQueueCraft | undefined {
  return craft.find((row) => row.input.droneId === droneId)
}

export function ClearanceQueue({
  state,
  craft,
  grantedBy,
  disabled = false,
  now = Date.now(),
  onStateChange,
}: {
  readonly state: ClearanceState
  readonly craft: readonly ClearanceQueueCraft[]
  readonly grantedBy: string
  readonly disabled?: boolean
  readonly now?: number
  readonly onStateChange?: (state: ClearanceState) => void
}) {
  const inputs = craft.map((row) => row.input)
  const synced = syncClearanceQueue(state, inputs, now)
  const queue = awaitingClearance(inputs, synced)
  const canGrant = !disabled && grantedBy.trim() !== ''

  useEffect(() => {
    if (synced !== state) onStateChange?.(synced)
  }, [state, synced, onStateChange])

  const grant = (request: ClearanceRequest) => {
    if (!canGrant) return
    const next = grantClearance(
      synced,
      request.droneId,
      request.missionId,
      grantedBy,
      now,
    )
    onStateChange?.(next)
  }

  const hold = (request: ClearanceRequest) => {
    if (!canGrant) return
    const next = holdClearance(synced, request.droneId, request.missionId, grantedBy, now)
    onStateChange?.(next)
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="clearance-queue-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="clearance-queue-heading" className="label m-0">
          Awaiting clearance
        </h2>
        <p className="m-0 text-value text-ink-subtle">
          <span className="tnum">{queue.length}</span>
          {' awaiting'}
        </p>
      </div>

      {queue.length === 0 ? (
        <p className="m-0 text-value text-ink-muted">{CLEARANCE_QUEUE_EMPTY}</p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {queue.map((request) => {
            const row = lookupCraft(craft, request.droneId)
            const label = row ? craftLabel(row) : request.droneId

            return (
              <li
                key={`${request.droneId}:${request.missionId}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-surface border border-hairline bg-surface-1 px-3 py-2"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-display text-body font-medium text-ink">{label}</span>
                  {row?.studentName ? (
                    <span className="text-value text-ink-subtle">Flown by {row.studentName}</span>
                  ) : null}
                  {/*
                   * Word, not colour alone (ADR-0004), and the Teacher's own answer read
                   * back to them. A held team is not a team nobody has looked at.
                   */}
                  <span
                    className={cn(
                      'text-label',
                      request.heldAt === null ? 'text-ink-muted' : 'text-status-not-ready',
                    )}
                  >
                    {request.heldAt === null ? 'Waiting' : 'Held'}
                  </span>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!canGrant}
                    onClick={() => grant(request)}
                    className={cn(
                      'min-h-11 shrink-0 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink',
                      'hover:border-ink disabled:cursor-not-allowed disabled:text-ink-muted disabled:hover:border-hairline',
                    )}
                  >
                    Grant clearance
                  </button>
                  <button
                    type="button"
                    disabled={!canGrant || request.heldAt !== null}
                    onClick={() => hold(request)}
                    className={cn(
                      'min-h-11 shrink-0 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-subtle',
                      'hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:text-ink-muted disabled:hover:border-hairline',
                    )}
                  >
                    Hold
                  </button>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
