'use client'

import { useEffect, useState } from 'react'
import {
  quietSeats,
  readClassroomSession,
  subscribeClassroom,
  type ClassroomSession,
} from '@/lib/classroom-session'
import { formatDuration } from '@/lib/age'
import { useFleet } from './FleetProvider'

/**
 * Which tablets have stopped saying they are there.
 *
 * Nothing tracked liveness at all, so a child whose iPad had died looked exactly like a child
 * flying happily. The Drone is still in the air either way, which is what makes this a safety
 * line rather than a support one: a Student who cannot see their screen cannot be told to
 * land by it.
 *
 * A seat that never checked in is not here. That is a child the Teacher put on a Drone by
 * hand, and reporting them as silent would be raising an alarm about a decision the Teacher
 * made deliberately.
 *
 * Not drawn at all when everyone is answering. A warning the eye stops seeing is not one.
 */
export function QuietTabletsNotice() {
  const { now } = useFleet()
  const [session, setSession] = useState<ClassroomSession | null>(null)

  useEffect(() => {
    setSession(readClassroomSession())
    return subscribeClassroom(setSession)
  }, [])

  if (session === null || now === 0) return null
  const quiet = quietSeats(session, now)
  if (quiet.length === 0) return null

  return (
    <section
      role="status"
      aria-label="Tablets that have gone quiet"
      className="flex flex-col gap-1 rounded-surface border-l-4 border-status-not-ready bg-surface-1 px-4 py-3"
    >
      {quiet.map((seat) => (
        <p key={seat.studentId} className="m-0 text-body text-ink">
          {seat.droneName ?? seat.name}, not heard from for {formatDuration(seat.quietForMs)}.
        </p>
      ))}
    </section>
  )
}
