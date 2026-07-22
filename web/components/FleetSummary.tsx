import type { DroneState } from '@techtechflight/contract'
import { isUsable, needsAttention } from '@techtechflight/contract'
import { cn } from '@/lib/utils'
import { STATUS_PRESENTATION } from '@/lib/status-presentation'
import { StatusGlyph } from './StatusBadge'

/**
 * The answer to the only question a Teacher actually has, before they read any detail.
 *
 * The Needs Attention count is present even when it is zero, so a Drone newly needing
 * attention is a number changing rather than an element materialising.
 */
export function FleetSummary({ drones }: { drones: readonly DroneState[] }) {
  const usable = drones.filter((drone) => isUsable(drone.status)).length
  const attention = drones.filter((drone) => needsAttention(drone.status)).length
  const flying = drones.filter((drone) => drone.status === 'Flying').length
  const offline = drones.filter((drone) => drone.status === 'Offline').length
  const severity = attentionSeverity(drones)
  const severityStatus =
    severity === 'fault' ? STATUS_PRESENTATION.Fault : STATUS_PRESENTATION['Not Ready']
  // Only the Drones inside the count can undermine it. See the qualifier below.
  const staleUsable = drones.filter((drone) => isUsable(drone.status) && drone.stale).length

  return (
    <header className="fleet-summary flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-hairline pb-4">
      <div className="flex flex-col gap-1">
        {/*
         * The board's only h1. ADR-0004 bars a headline above the Fleet summary, so the
         * summary count is the heading rather than sitting under one — which is also the
         * truth of the page: a Teacher opening this is asking exactly this question.
         */}
        <h1 className="m-0 flex items-baseline gap-3 font-display text-summary font-medium">
          {/*
           * In em, not px. -0.02em is exactly the -0.88px this was set at against a 44px
           * count, but held in px the board's largest number loosened as it grew: at 2×
           * the size doubled to 88px while the tracking stayed put, halving it in
           * relative terms. Large type wants more negative tracking, not less.
           */}
          <span className="tnum tracking-[-0.02em]">{usable}</span>
          <span className="text-heading text-ink-subtle"> of {drones.length} ready</span>
        </h1>

        {/*
         * Stale is orthogonal to Status: Telemetry ages into Stale a while before it ages
         * into Offline, so a Drone can still be counted Ready on a reading that may no
         * longer be true. Every tile already hedges about its own Telemetry — this is the
         * count doing the same, because the number above is the one thing a Teacher reads
         * from across the room, and it was the only element on the board still speaking
         * with total confidence about Telemetry nobody has heard in minutes.
         *
         * Deliberately not a live region. The board already has two, and the comment on
         * the Needs Attention count explains what a third unnamed one would cost. This is
         * a qualifier on a heading, read when the heading is read.
         *
         * Absent rather than zero, unlike the Needs Attention count: that number is
         * watched and must change rather than appear, whereas Telemetry going Stale is
         * genuinely news arriving, and news is allowed to arrive.
         */}
        {staleUsable > 0 && (
          <p className="tnum m-0 text-value italic text-stale" data-stale="true">
            {staleUsable} of those not heard from recently
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {/*
         * Announced, because this is the one number whose whole job is to reach a Teacher
         * who is looking at the room rather than the board. The glyph repeats the highest
         * severity without colour: a square means at least one Fault, while the half-filled
         * circle means everything here can be put right before the lesson.
         */}
        <p
          className={cn(
            // Already present at zero, so what a Teacher catches is this resolving.
            'tnum m-0 inline-flex items-center gap-2 text-body font-medium',
            severity === 'fault' && 'text-status-fault',
            severity === 'fixable' && 'text-status-not-ready',
            severity === undefined && 'text-ink-muted',
          )}
          {...(severity ? { 'data-severity': severity } : {})}
          role="status"
          aria-label={attentionLabel(attention, severity)}
        >
          {severity && <StatusGlyph shape={severityStatus.shape} />}
          {attention} {attention === 1 ? 'needs' : 'need'} attention
        </p>

        {flying > 0 && (
          <p className="tnum m-0 text-body text-ink-muted">{flying} flying</p>
        )}

        {/*
         * Offline is quiet but not missing. Without this number the summary invites
         * arithmetic that does not add up whenever switched-off Drones are in the Fleet.
         */}
        {offline > 0 && (
          <p className="tnum m-0 text-body text-ink-muted">{offline} offline</p>
        )}
      </div>
    </header>
  )
}

function attentionLabel(
  attention: number,
  severity: 'fault' | 'fixable' | undefined,
): string {
  const count = `Drones needing attention: ${attention}.`
  if (severity === 'fault') return `${count} At least one has a Fault.`
  if (severity === 'fixable') return `${count} All can be put right before the lesson.`
  return count
}

/**
 * How loudly the Needs Attention count should speak.
 *
 * The bucket deliberately hides which Drones are which, but flattening both into the
 * coral would undo the distinction the rest of the board is built on (ADR-0004): amber
 * is a Teacher with charging to do, coral is a Drone leaving the set. A Fleet that only
 * needs plugging in must not shout as loudly as one with a Drone out of service.
 */
function attentionSeverity(drones: readonly DroneState[]): 'fault' | 'fixable' | undefined {
  if (drones.some((drone) => drone.status === 'Fault')) return 'fault'
  if (drones.some((drone) => needsAttention(drone.status))) return 'fixable'
  return undefined
}
