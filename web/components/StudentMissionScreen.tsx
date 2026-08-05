'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { DEFAULT_THRESHOLDS } from '@techtechflight/contract'
import {
  joinClassroomAsStudent,
  readClassroomSession,
  readStudentSeatLocal,
  requestTakeoff,
  subscribeClassroom,
  type ClassroomSeat,
  type ClassroomSession,
} from '@/lib/classroom-session'
import { readLogbook, readServerLogbook, subscribeLogbook } from '@/lib/logbook'
import {
  evaluatePreFlightSeven,
  LINK_QUALITY_WEAK,
  preFlightSevenDoneCount,
  preFlightSevenStatusWord,
  propellersTicked,
  readPreFlightSeven,
  type PreFlightSevenReading,
} from '@/lib/preflight-seven'
import { formatAge } from '@/lib/age'
import { useFleet } from './FleetProvider'
import { cn } from '@/lib/utils'

/**
 * The Student's Mission, on one screen that changes as the Mission does.
 *
 * Landscape and full width, because it is read on a tablet propped on a desk from about
 * two metres away, not held in a hand. One thing dominates and it changes with the phase;
 * everything else stays quiet until it matters.
 *
 * The screen this replaces was rejected on sight, and its faults are worth naming so they
 * do not return: a phone-width column in the middle of a tablet, six equal chips in a grid
 * so nothing led, the objective crammed into a chip beside a number, a heading-sized largest
 * element on a screen read at arm's length, a permanent classroom code, and a placeholder
 * string printed where a battery reading belongs. No figure here is invented: a reading the
 * Fleet is not sending is said in words.
 *
 * Nothing on this screen reaches an aircraft. Asking for takeoff is a record (ADR-0021);
 * the Students fly by hand.
 */
export function StudentMissionScreen() {
  const [session, setSession] = useState<ClassroomSession | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)

  // Read on mount rather than in an initialiser: the server render has no localStorage and
  // must not disagree with the first client paint.
  useEffect(() => {
    setSession(readClassroomSession())
    setStudentId(readStudentSeatLocal()?.studentId ?? null)
    return subscribeClassroom((next) => setSession(next))
  }, [])

  if (session === null) {
    return (
      <StudentFrame>
        <p className="m-0 text-body text-ink-muted">
          Waiting for the Teacher to open the classroom.
        </p>
      </StudentFrame>
    )
  }

  const seat = session.seats.find((row) => row.studentId === studentId) ?? null

  if (seat === null) {
    return (
      <TakeYourSeat
        session={session}
        onSeated={(next, taken) => {
          setSession(next)
          setStudentId(taken.studentId)
        }}
      />
    )
  }

  return <MissionBrief session={session} seat={seat} onSession={setSession} />
}

/**
 * Full width, and a floor rather than a ceiling.
 *
 * `min-h-[100dvh]` because this is the whole device, and no max width because the device
 * is a tablet in landscape. The old screen put a phone-width column in the middle of it.
 */
function StudentFrame({ children }: { readonly children: React.ReactNode }) {
  return (
    <main
      id="content"
      tabIndex={-1}
      className="flex min-h-[100dvh] w-full flex-col gap-6 bg-canvas p-6 min-[48rem]:p-8"
    >
      {children}
    </main>
  )
}

/**
 * Who is at this tablet, chosen from the class roll.
 *
 * No typing and no classroom code. A child at a shared tablet knows their own name and
 * nothing else; a four-character code they have to be told, and then keep, is a step that
 * exists for the software rather than for them.
 */
function TakeYourSeat({
  session,
  onSeated,
}: {
  readonly session: ClassroomSession
  readonly onSeated: (session: ClassroomSession, seat: ClassroomSeat) => void
}) {
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)
  const taken = new Set(session.seats.map((row) => row.name))
  const roll = book.roster.filter((student) => !taken.has(student.name))

  return (
    <StudentFrame>
      <h1 className="m-0 font-display text-heading font-medium text-ink">Who are you?</h1>

      {roll.length === 0 ? (
        <p className="m-0 text-body text-ink-muted">
          {book.roster.length === 0
            ? 'The class list is empty. Ask your Teacher to add it.'
            : 'Everyone on the class list has taken a tablet already. Ask your Teacher.'}
        </p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 min-[48rem]:grid-cols-4">
          {roll.map((student) => (
            <li key={student.studentId}>
              <button
                type="button"
                onClick={() => {
                  const joined = joinClassroomAsStudent(session, student.name)
                  onSeated(joined.session, joined.seat)
                }}
                className="min-h-14 w-full cursor-pointer rounded-surface border border-hairline bg-surface-1 px-4 py-3 font-display text-body font-medium text-ink hover:border-ink"
              >
                {student.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </StudentFrame>
  )
}

/**
 * The brief: what we are doing today, and the check before we fly.
 *
 * Reading order is the order it matters in. The identity line is thin because a Student
 * knows their own name; the objective is the largest type on the screen because it is the
 * one thing they must still be able to read when the tablet is on the desk and they are
 * standing at the flight line.
 */
function MissionBrief({
  session,
  seat,
  onSession,
}: {
  readonly session: ClassroomSession
  readonly seat: ClassroomSeat
  readonly onSession: (session: ClassroomSession) => void
}) {
  return (
    <StudentFrame>
      <IdentityLine seat={seat} />

      <AmIConnected seat={seat} />

      <h1 className="m-0 max-w-[24ch] font-display text-summary font-medium text-balance text-ink">
        {session.objective.trim() === ''
          ? 'Your Teacher has not set the objective yet.'
          : session.objective}
      </h1>

      <MissionTerms session={session} />

      <PreFlightForMyCraft seat={seat} />

      <AskToTakeOff seat={seat} session={session} onSession={onSession} />
    </StudentFrame>
  )
}

/**
 * Two questions a Student asks before anything else, answered in words.
 *
 * Poster step 4. Am I joined to the Teacher's board, and is my craft actually talking. A
 * frozen screen and a working screen look identical, so the age of the last reading is the
 * answer to the first; a craft that is not reporting is the answer to the second, and it
 * shows **no figure at all** rather than a stale one dressed as live.
 *
 * Shape as well as colour on both, because colour is never the only channel (ADR-0004).
 */
function AmIConnected({ seat }: { readonly seat: ClassroomSeat }) {
  const { snapshot, vitals, now } = useFleet()

  const boardAgeMs = snapshot.receivedAt === null ? null : Math.max(0, now - snapshot.receivedAt)
  const mine = vitals.find((entry) => entry.droneId === seat.droneId) ?? null
  const telemetry =
    snapshot.state?.drones.find((drone) => drone.id === seat.droneId)?.telemetry ?? null
  const reporting = mine !== null && telemetry !== null

  const link = telemetry?.linkQuality
  const battery = mine?.batteryFraction ?? null

  return (
    <div className="flex flex-wrap gap-3">
      <StatusLine
        ok={boardAgeMs !== null}
        label="The Teacher's board"
        says={
          boardAgeMs === null
            ? 'Not reaching it yet.'
            : `Joined. Last heard ${formatAge(boardAgeMs)}.`
        }
      />
      <StatusLine
        ok={reporting}
        label={seat.droneName ?? 'Your craft'}
        says={
          seat.droneId === null
            ? 'You do not have a craft yet.'
            : !reporting
              ? 'Not reporting. Tell your Teacher.'
              : null
        }
      >
        {reporting ? (
          <span className="flex flex-wrap gap-x-4 gap-y-1 text-value text-ink-subtle">
            {battery === null ? (
              <span>Charge not reported</span>
            ) : (
              <span>
                <span className="tnum">{Math.round(battery * 100)}</span>% charge
              </span>
            )}
            {link === undefined ? (
              <span>Signal not reported</span>
            ) : (
              <span>{link < LINK_QUALITY_WEAK ? 'Signal weak' : 'Signal strong'}</span>
            )}
          </span>
        ) : null}
      </StatusLine>
    </div>
  )
}

function StatusLine({
  ok,
  label,
  says,
  children,
}: {
  readonly ok: boolean
  readonly label: string
  readonly says?: string | null
  readonly children?: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-1 items-start gap-3 rounded-surface border border-hairline bg-surface-1 px-4 py-3">
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-pill border text-label',
          ok ? 'border-ink bg-ink text-canvas' : 'border-status-not-ready text-status-not-ready',
        )}
      >
        {ok ? '✓' : '!'}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-display text-value font-medium text-ink">{label}</span>
        {says ? <span className="text-value text-ink-subtle">{says}</span> : null}
        {children}
      </span>
    </div>
  )
}

/** Name and craft, thin. A Student knows their own name; this is only confirming it. */
function IdentityLine({ seat }: { readonly seat: ClassroomSeat }) {
  return (
    <p className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-value text-ink-subtle">
      <span className="font-medium text-ink">{seat.name}</span>
      {seat.droneName === null ? (
        <span>Your Teacher has not given you a craft yet.</span>
      ) : (
        <span>{seat.droneName}</span>
      )}
    </p>
  )
}

/** The rules, the clock and how many checkpoints. Quiet: read once, then remembered. */
function MissionTerms({ session }: { readonly session: ClassroomSession }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 flex flex-wrap gap-x-6 gap-y-1 text-value text-ink-subtle">
        <span>
          <span className="tnum">{session.limitMinutes}</span> minutes
        </span>
        <span>
          <span className="tnum">{session.checkpointCount}</span>{' '}
          {session.checkpointCount === 1 ? 'checkpoint' : 'checkpoints'}
        </span>
      </p>

      {session.rules.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {session.rules.map((rule) => (
            <li key={rule} className="text-value text-ink-subtle">
              {rule}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * The seven items, for this Student's craft and no other.
 *
 * A Student checking the whole Fleet is a Teacher's job on a Teacher's screen. Six read
 * themselves from Telemetry; propellers is the one a person looks at, and the Teacher ticks
 * it on the board, so it is shown here and not pressable.
 */
function PreFlightForMyCraft({ seat }: { readonly seat: ClassroomSeat }) {
  const { snapshot } = useFleet()
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)

  if (seat.droneId === null) return null

  const telemetry =
    snapshot.state?.drones.find((drone) => drone.id === seat.droneId)?.telemetry ?? null
  const ticked = propellersTicked(readPreFlightSeven(null), seat.droneId)
  const readings = evaluatePreFlightSeven(telemetry, ticked, DEFAULT_THRESHOLDS)
  const done = preFlightSevenDoneCount(readings)

  return (
    <section className="flex flex-col gap-2" aria-labelledby="student-preflight">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="student-preflight" className="label m-0">
          Before you fly
        </h2>
        <p className="m-0 text-value text-ink-subtle">
          <span className="tnum">{done}</span> of <span className="tnum">{readings.length}</span> OK
        </p>
      </div>

      <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 min-[48rem]:grid-cols-2">
        {readings.map((item) => (
          <PreFlightRow key={item.id} item={item} />
        ))}
      </ul>
    </section>
  )
}

function PreFlightRow({ item }: { readonly item: PreFlightSevenReading }) {
  const word = preFlightSevenStatusWord(item.status)
  const passed = item.status === 'pass'

  return (
    <li
      className="flex min-h-11 items-start gap-3 rounded-sm border border-hairline bg-surface-1 px-3 py-2"
      aria-label={`${item.label}: ${word}`}
    >
      {/* Shape as well as colour, always (ADR-0004). */}
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm border text-label',
          passed
            ? 'border-ink bg-ink text-canvas'
            : item.status === 'fail'
              ? 'border-status-not-ready text-status-not-ready'
              : 'border-hairline text-ink-muted',
        )}
      >
        {passed ? '✓' : item.status === 'fail' ? '!' : '?'}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-display text-value font-medium text-ink">{item.label}</span>
          <span className="text-value text-ink-subtle">{word}</span>
        </span>
        {passed ? null : (
          <span className="text-value text-ink-muted">{item.detail}</span>
        )}
      </span>
    </li>
  )
}

/**
 * The one thing to press.
 *
 * Asking is a record, not a Command (ADR-0021). Nothing here starts a motor; it puts the
 * Student in the Teacher's queue and the Teacher answers on their own board.
 */
function AskToTakeOff({
  seat,
  session,
  onSession,
}: {
  readonly seat: ClassroomSeat
  readonly session: ClassroomSession
  readonly onSession: (session: ClassroomSession) => void
}) {
  if (seat.droneId === null) return null

  return (
    <button
      type="button"
      onClick={() => onSession(requestTakeoff(session, seat.studentId))}
      className="min-h-16 w-full cursor-pointer rounded-surface border-0 bg-ink px-6 py-4 font-display text-heading font-medium text-canvas min-[48rem]:w-fit"
    >
      Ask to take off
    </button>
  )
}
