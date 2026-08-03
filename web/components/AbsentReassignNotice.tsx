'use client'

import type { AbsentReassignResult } from '@/lib/absent-reassign'

/**
 * Says what marking a Student absent did: craft freed, who is next on the waiting list.
 *
 * Colour is never the sole meaning — the words carry the fact. Mount on the Lesson screen
 * after the Integrator calls `markAbsentAndFreeCraft`.
 */
export function AbsentReassignNotice({
  result,
  droneNames = {},
}: {
  readonly result: AbsentReassignResult | null
  /** Optional Drone Name lookup so the notice can say "Drone 3" rather than an id. */
  readonly droneNames?: Readonly<Record<string, string>>
}) {
  if (result === null) return null

  const craft =
    result.freedDroneId === null
      ? null
      : (droneNames[result.freedDroneId] ?? result.freedDroneId)

  const parts: string[] = [`${result.studentName} is absent.`]
  if (craft !== null) {
    parts.push(`${craft} is free.`)
  }
  if (result.nextWaitingName !== null) {
    parts.push(`Next: ${result.nextWaitingName}.`)
  } else {
    parts.push('Nobody waiting.')
  }

  return (
    <p className="m-0 text-value text-ink-subtle" role="status">
      {parts.join(' ')}
    </p>
  )
}
