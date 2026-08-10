'use client'

import {
  allPointsReached,
  type ClassroomSeat,
  type ClassroomSession,
} from '@/lib/classroom-session'
import type { MissionCheckpoint } from '@/lib/mission'

/**
 * Approve a finished task, and only a finished one.
 *
 * The button cannot appear before a Drone has reached every required point, and that is the
 * whole design: a Teacher watching six teams cannot also be checking whether each one
 * actually flew the route, so the board will not offer them the chance to say it did.
 * The points tick off from Telemetry, so nobody can claim one they did not fly to.
 *
 * One tap. It is the Teacher's, never the Student's: approving from the tablet would be a
 * third pressable thing there and would let a team mark its own work (ADR-0025).
 *
 * Approving is a record, not a Command. Nothing here reaches an aircraft (ADR-0021); it
 * moves the Student's tablet to the way down and tells them to land on their pad.
 */
export function TaskApproval({
  session,
  checkpoints,
  onApprove,
}: {
  readonly session: ClassroomSession | null
  readonly checkpoints: readonly MissionCheckpoint[]
  readonly onApprove: (seat: ClassroomSeat) => void
}) {
  if (session === null) return null

  const finished = session.seats.filter(
    (seat) => seat.approvedAt === null && allPointsReached(seat, checkpoints),
  )
  if (finished.length === 0) return null

  return (
    <section className="flex flex-col gap-3" aria-labelledby="task-approval-heading">
      <h2 id="task-approval-heading" className="label m-0">
        Task done
      </h2>
      {/*
       * What Approve means, said once above the rows. This is how a flight ends, and the
       * sentence is here because the alternative a Teacher reaches for is Recall: it is on
       * every strip, it works, and it is the fire alarm. A team that has finished is told to
       * bring it home; a team in trouble is recalled.
       */}
      <p className="m-0 max-w-[62ch] text-value text-ink-subtle">
        Approve tells the team to return home and land. Their tablet says so, and the board
        sees them down from Telemetry. Recall is for trouble, not for finishing.
      </p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {finished.map((seat) => (
          <li
            key={seat.studentId}
            className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-surface border border-hairline bg-surface-1 px-3 py-2"
          >
            <span className="font-display text-body font-medium text-ink">{seat.name}</span>
            {seat.droneName ? (
              <span className="text-value text-ink-subtle">{seat.droneName}</span>
            ) : null}
            <span className="tnum text-value text-ink-muted">
              {seat.reachedCheckpointIds.length} of {checkpoints.length} reached
            </span>
            <button
              type="button"
              onClick={() => onApprove(seat)}
              className="ml-auto min-h-11 cursor-pointer rounded-pill border-0 bg-ink px-4 py-1.5 text-value font-medium text-canvas hover:opacity-90"
            >
              Approve
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
