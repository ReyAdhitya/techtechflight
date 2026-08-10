'use client'

import { useEffect, useState } from 'react'
import {
  QUIET_AFTER_MS,
  classroomRows,
  freeDroneSeat,
  readClassroomSession,
  seatStudentByHand,
  subscribeClassroom,
  type ClassroomSeat,
  type ClassroomSession,
} from '@/lib/classroom-session'
import { formatDuration } from '@/lib/age'

/**
 * Who is on which Drone, as the board fills itself in.
 *
 * The list a Teacher glances at while they are handing aircraft out. Children join on their
 * own tablets and the rows fill themselves; the Teacher never prepares a roster and never
 * confirms one.
 *
 * Two things a Teacher can do here, and both are one tap:
 *
 * - **Put a child on a Drone by hand.** A broken iPad must not stop a child flying. They
 *   cannot see their own screen, and the Teacher standing three metres away saying so out
 *   loud is what a room does when technology fails.
 * - **Free a Drone.** A seat holding a craft nobody is flying is what stops the next child
 *   taking it.
 *
 * **The Teacher's change always wins.** Typing a name over a Drone somebody has taken
 * reassigns it rather than refusing: the Teacher can see both children and the software
 * cannot. Nothing here reaches an aircraft (ADR-0021).
 */
export function ClassroomSeatsPanel() {
  const [session, setSession] = useState<ClassroomSession | null>(null)
  const [typing, setTyping] = useState<string | null>(null)
  const [name, setName] = useState('')
  /*
   * Its own clock rather than the Fleet's. How long a tablet has been quiet is a fact about
   * the room and not about the aircraft, and this panel is on a set-up step that has no
   * business needing a Fleet connection to render a list of names. Zero until mounted, so
   * the server's HTML and the first client paint agree.
   */
  const [now, setNow] = useState(0)

  // Read after mount: the server render has no localStorage.
  useEffect(() => {
    setSession(readClassroomSession())
    return subscribeClassroom(setSession)
  }, [])

  useEffect(() => {
    setNow(Date.now())
    const tick = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(tick)
  }, [])

  if (session === null) {
    return (
      <p className="m-0 text-value text-ink-muted">
        Who is on which Drone appears once a Mission is planned for this period.
      </p>
    )
  }

  const rows = classroomRows(session)

  if (rows.length === 0) {
    return (
      <p className="m-0 text-value text-ink-muted">
        Put teams on craft above, then this fills itself in as children join.
      </p>
    )
  }

  const joined = rows.filter((row) => row.seat !== null).length

  return (
    <section className="flex flex-col gap-3" aria-labelledby="classroom-seats-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 id="classroom-seats-heading" className="label m-0">
          Who is on which Drone
        </h3>
        <p className="m-0 text-value text-ink-subtle" role="status">
          <span className="tnum">{joined}</span>
          {' of '}
          <span className="tnum">{rows.length}</span>
          {' taken'}
        </p>
      </div>

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.map((row) => {
          const asking = typing === row.droneId
          return (
            <li
              key={row.droneId}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-sm border border-hairline bg-canvas px-3 py-2"
            >
              <span className="min-w-24 font-display text-value font-medium text-ink">
                {row.droneName}
              </span>

              {asking ? (
                <form
                  className="flex flex-wrap items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (name.trim() === '') return
                    setSession(seatStudentByHand(session, row.droneId, name))
                    setTyping(null)
                    setName('')
                  }}
                >
                  <input
                    autoFocus
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    aria-label={`Student on ${row.droneName}`}
                    className="min-h-11 rounded-pill border border-hairline bg-surface-1 px-3 text-value text-ink"
                  />
                  <button
                    type="submit"
                    className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setTyping(null)}
                    className="min-h-11 cursor-pointer rounded-pill border-0 bg-transparent px-2 text-value text-ink-muted hover:text-ink"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3">
                    <span className="text-value text-ink-subtle">
                      {row.seat === null ? 'No Student' : row.seat.name}
                    </span>
                    {row.seat === null ? null : <Liveness seat={row.seat} now={now} />}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTyping(row.droneId)
                      setName(row.seat?.name ?? '')
                    }}
                    className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
                  >
                    {row.seat === null ? 'Put a Student on it' : 'Change the name'}
                  </button>
                  {row.seat === null ? null : (
                    <button
                      type="button"
                      onClick={() => setSession(freeDroneSeat(session, row.droneId))}
                      className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-subtle hover:border-ink hover:text-ink"
                    >
                      Free it
                    </button>
                  )}
                </>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/**
 * Whether this child's tablet is still saying it is there.
 *
 * Three answers, and the third is the one that matters. **No tablet** is a child the Teacher
 * seated by hand: they are flying with no screen on purpose, and calling that silence would
 * be an alarm about the Teacher's own decision. **Answering** is quiet on the row. **Not
 * heard from** is the sentence, because the Drone is in the air either way and a Student who
 * cannot see their screen cannot be told to land by it.
 */
function Liveness({ seat, now }: { readonly seat: ClassroomSeat; readonly now: number }) {
  const seen = seat.seenAt ?? null
  // Before the clock has ticked once there is nothing honest to say about an age.
  if (now === 0) return null
  if (seen === null) {
    return <span className="text-value text-ink-muted">No tablet</span>
  }
  const quiet = now - seen
  if (quiet < QUIET_AFTER_MS) {
    return <span className="text-value text-ink-muted">Answering</span>
  }
  return (
    <span className="text-value text-status-not-ready">
      Not heard from for {formatDuration(quiet)}
    </span>
  )
}
