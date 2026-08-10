'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { DEFAULT_THRESHOLDS } from '@techtechflight/contract'
import {
  HEARTBEAT_EVERY_MS,
  boardQuietForMs,
  canTakeDrone,
  droneGrid,
  joinClassroomAsStudent,
  loadClassroomByCode,
  normalizeClassroomCode,
  readClassroomSession,
  readStudentSeatLocal,
  markSeatComplete,
  markSeatFlown,
  requestTakeoff,
  seatHasFlown,
  subscribeClassroom,
  takeDroneSeat,
  touchSeat,
  type ClassroomInstruction,
  type ClassroomRosterEntry,
  type ClassroomSeat,
  type ClassroomSession,
  type StudentSeatLocal,
} from '@/lib/classroom-session'
import { breachesAt, type AirspaceBreach } from '@/lib/airspace'
import { byUrgency, playbookFor, type PlaybookEntry } from '@/lib/incident-playbook'
import type { VitalsAlert } from '@/lib/vitals'
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
import { Scope } from './Scope'
import { useFleet } from './FleetProvider'
import { CRITERION_WORDS, emptyMission, type MissionOutcome } from '@/lib/mission'
import { scenarioOrUnknown } from '@/lib/mission-scenarios'
import { missionClock } from '@/lib/mission-clock'
import { StudentStepRail } from './StudentStepRail'
import { pointsLeft, studentStep, type StudentNow } from '@/lib/student-steps'
import { worstWhatIf, type WhatIfAnswer } from '@/lib/student-what-if'
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
  const [hydrated, setHydrated] = useState(false)
  const [session, setSession] = useState<ClassroomSession | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [remembered, setRemembered] = useState<StudentSeatLocal | null>(null)

  const onJoinedClassroom = useCallback((next: ClassroomSession) => {
    setSession(next)
  }, [])

  // Read on mount rather than in an initialiser: the server render has no localStorage and
  // must not disagree with the first client paint.
  useEffect(() => {
    setSession(readClassroomSession())
    const local = readStudentSeatLocal()
    setRemembered(local)
    setStudentId(local?.studentId ?? null)
    setHydrated(true)
    return subscribeClassroom((next) => setSession(next))
  }, [])

  const seat = session?.seats.find((row) => row.studentId === studentId) ?? null

  /*
   * Typed once, remembered after that. A tablet that already knows whose it is takes its own
   * seat rather than asking a child the same question every morning, which is the difference
   * between a join that takes four taps and one that takes one.
   */
  useEffect(() => {
    if (session === null || seat !== null || remembered === null) return
    if (remembered.name.trim() === '') return
    const joined = joinClassroomAsStudent(
      session,
      remembered.name,
      Date.now(),
      remembered.studentId,
    )
    setSession(joined.session)
    setStudentId(joined.seat.studentId)
  }, [session, seat, remembered])

  if (!hydrated) {
    return (
      <StudentFrame>
        <p className="m-0 text-body text-ink-muted">Opening…</p>
      </StudentFrame>
    )
  }

  if (session === null) {
    return <JoinClassroomDoor onJoined={onJoinedClassroom} />
  }

  if (seat === null) {
    return (
      <WhatIsYourName
        session={session}
        onSeated={(next, taken) => {
          setSession(next)
          setStudentId(taken.studentId)
          setRemembered(readStudentSeatLocal())
        }}
      />
    )
  }

  if (seat.droneId === null) {
    return <WhichDroneAreYouHolding session={session} seat={seat} onSession={setSession} />
  }

  return <SeatedStudent session={session} seat={seat} onSession={setSession} />
}

/**
 * Which screen a Student is on is decided by the aircraft, not by them.
 *
 * Off the ground is flying, and there is no button anywhere that says otherwise. This sits
 * in its own component so the Telemetry read happens unconditionally, after the seat is
 * known: the screen above it returns early twice before a seat exists.
 */
function SeatedStudent({
  session,
  seat,
  onSession,
}: {
  readonly session: ClassroomSession
  readonly seat: ClassroomSeat
  readonly onSession: (session: ClassroomSession) => void
}) {
  const { vitals } = useFleet()
  const mine = seat.droneId === null
    ? null
    : (vitals.find((entry) => entry.droneId === seat.droneId) ?? null)
  const airborne = mine?.airborne === true

  /*
   * Down after flying is not the same as never having left, and neither is decided by a
   * button. The first sighting off the ground is recorded once, from Telemetry, so a
   * Student cleared and still standing on the pad is not told they have landed.
   */
  const hasFlown = seatHasFlown(seat)

  useEffect(() => {
    if (!airborne || hasFlown) return
    onSession(markSeatFlown(session, seat.studentId))
  }, [airborne, hasFlown, onSession, seat.studentId, session])

  /*
   * This tablet's half of the heartbeat, so the Teacher's board can tell a child who is
   * flying happily from one whose iPad died. Deliberately not in the render path and
   * deliberately re-reading the session: it fires on a timer, and whatever this component is
   * holding may be a write from the Teacher that has just landed.
   */
  useEffect(() => {
    touchSeat(seat.studentId)
    const beat = window.setInterval(() => touchSeat(seat.studentId), HEARTBEAT_EVERY_MS)
    return () => window.clearInterval(beat)
  }, [seat.studentId])

  return (
    <StudentPhase
      session={session}
      seat={seat}
      airborne={airborne}
      hasFlown={hasFlown}
      onSession={onSession}
    />
  )
}

/**
 * Which of the twelve screens is up, and the two phases nothing used to set.
 *
 * `'returning'` follows the Teacher's approval and `'complete'` follows the Drone being
 * down. Both are records: approval is the Teacher's one tap, and down is Telemetry. Before
 * this, twelve screens existed and five could be reached, because a Student who took off
 * never saw their tablet change again.
 */
function StudentPhase({
  session,
  seat,
  airborne,
  hasFlown,
  onSession,
}: {
  readonly session: ClassroomSession
  readonly seat: ClassroomSeat
  readonly airborne: boolean
  readonly hasFlown: boolean
  readonly onSession: (session: ClassroomSession) => void
}) {
  const { vitals, now: clock } = useFleet()
  const mine = seat.droneId === null
    ? null
    : (vitals.find((entry) => entry.droneId === seat.droneId) ?? null)

  const breaches = mine?.position ? breachesAt(session.zones, mine.position) : []
  const instruction = session.instructions.at(-1) ?? null
  const whatIf = worstWhatIf(mine?.alerts ?? [])

  /*
   * Down after the Teacher approved is the end of the Mission for this seat. Telemetry
   * says so, never a press, and only from `returning`: a Drone that touches down mid-
   * Mission has landed, not finished.
   */
  useEffect(() => {
    if (airborne || seat.phase !== 'returning') return
    onSession(markSeatComplete(session, seat.studentId))
  }, [airborne, onSession, seat.phase, seat.studentId, session])

  const now: StudentNow = {
    airborne,
    inNoFlyZone: breaches.length > 0,
    instructionWaiting: instruction !== null && airborne,
  }
  const step = studentStep(seat, session, now)
  const lostBoardMs = boardQuietForMs(session, clock)

  const rail = (
    <StudentStepRail current={step} name={seat.name} droneName={seat.droneName} />
  )

  if (seat.phase === 'complete' || session.outcome != null) {
    if (!airborne && hasFlown) {
      return <BackOnTheGround session={session} seat={seat} rail={rail} />
    }
  }

  if (seat.phase === 'returning') {
    return <LandOnYourPad seat={seat} rail={rail} airborne={airborne} />
  }

  if (airborne && breaches.length > 0) {
    return <RedZoneTakeover breaches={breaches} rail={rail} />
  }

  /*
   * The board has gone quiet, so every figure on this screen is the last thing it said rather
   * than what is true now. Under the red zone, because getting out of one is the more urgent
   * of the two and the zone is drawn from the Drone's own position; over everything else,
   * because a screen of held numbers wearing a live screen's clothes is the failure this
   * product refuses everywhere else, one reading at a time.
   */
  if (lostBoardMs !== null) return <LostTheBoard quietForMs={lostBoardMs} rail={rail} />

  if (airborne) {
    if (whatIf !== null) return <WhatIfTakeover answer={whatIf} rail={rail} />
    return <FlyingScreen session={session} seat={seat} rail={rail} />
  }

  if (hasFlown) return <BackOnTheGround session={session} seat={seat} rail={rail} />
  return <MissionBrief session={session} seat={seat} onSession={onSession} rail={rail} />
}

/**
 * Every point reached, and the Teacher has not answered yet.
 *
 * The Student does nothing here, and that is the screen: there is no third button, and no
 * amount of pressing brings the approval forward.
 */
function TaskDone({
  seat,
  reached,
  rail,
}: {
  readonly seat: ClassroomSeat
  readonly reached: number
  readonly rail: React.ReactNode
}) {
  return (
    <StudentFrame rail={rail}>
      <IdentityLine seat={seat} />
      <p className="m-0 label">Every point reached</p>
      <h1 className="m-0 font-display text-summary font-medium text-balance text-ink">
        Wait for your teacher
      </h1>
      <p className="m-0 max-w-[50ch] text-body text-ink-subtle">
        Your Drone reached all {reached}. Your teacher is checking.
      </p>
    </StudentFrame>
  )
}

/** The Teacher approved it, so the way down has started. Still nothing to press. */
function LandOnYourPad({
  seat,
  rail,
  airborne,
}: {
  readonly seat: ClassroomSeat
  readonly rail: React.ReactNode
  readonly airborne: boolean
}) {
  return (
    <StudentFrame rail={rail}>
      <IdentityLine seat={seat} />
      <p className="m-0 label">Your teacher approved it</p>
      <h1 className="m-0 font-display text-summary font-medium text-balance text-ink">
        Land on your pad
      </h1>
      <p className="m-0 max-w-[50ch] text-body text-ink-subtle">
        {airborne
          ? 'Come down slowly onto the spot you started from.'
          : 'You are down. Stand clear of the propellers and wait.'}
      </p>
    </StudentFrame>
  )
}

/**
 * A warning takes the whole screen (ADR-0025).
 *
 * Nothing else is on it, because the one thing a child has to do about a red zone is get
 * out of it and a battery percentage underneath would be competing for the same two
 * seconds of attention.
 */
function RedZoneTakeover({
  breaches,
  rail,
}: {
  readonly breaches: readonly AirspaceBreach[]
  readonly rail: React.ReactNode
}) {
  const worst = breaches[0]!
  return (
    <StudentFrame rail={rail} tone="warning">
      <p className="m-0 label">Red area</p>
      <h1
        role="status"
        className="m-0 font-display text-summary font-medium text-balance text-status-fault"
      >
        Move away
      </h1>
      <p className="m-0 max-w-[50ch] text-body text-ink">
        You are inside {worst.zoneName}. Come out the way you went in.
      </p>
    </StudentFrame>
  )
}

/**
 * The board has stopped answering, so this screen has stopped being true.
 *
 * A frozen tablet and a working tablet look identical, which is the whole reason this exists.
 * Every figure the Student was reading came from the Teacher's board; when it goes quiet the
 * honest thing is to say so and print none of them, rather than hold the last set on screen
 * where they read as live. The same rule that refuses a zero for an absent battery, applied
 * to a whole screen.
 *
 * What to do about it is a sentence a ten year old can act on. Nothing to press.
 */
function LostTheBoard({
  quietForMs,
  rail,
}: {
  readonly quietForMs: number
  readonly rail: React.ReactNode
}) {
  return (
    <StudentFrame rail={rail} tone="warning">
      <p className="m-0 label">Not hearing your teacher&apos;s board</p>
      <h1
        role="status"
        className="m-0 font-display text-summary font-medium text-balance text-status-fault"
      >
        Land and wait
      </h1>
      <p className="m-0 max-w-[50ch] text-body text-ink">
        This tablet stopped hearing the board {formatAge(quietForMs)}. Anything it showed you
        before that is old. Put your Drone down and tell your teacher.
      </p>
    </StudentFrame>
  )
}

/** One of the four the poster names, at the size the whole screen gives it. */
function WhatIfTakeover({
  answer,
  rail,
}: {
  readonly answer: WhatIfAnswer
  readonly rail: React.ReactNode
}) {
  return (
    <StudentFrame rail={rail} tone="warning">
      <p className="m-0 label">What to do</p>
      <h1
        role="status"
        className="m-0 font-display text-summary font-medium text-balance text-status-fault"
      >
        {answer.heading}
      </h1>
      <p className="m-0 max-w-[50ch] text-body text-ink">{answer.says}</p>
    </StudentFrame>
  )
}

/**
 * Full width, and a floor rather than a ceiling.
 *
 * `min-h-[100dvh]` because this is the whole device, and no max width because the device
 * is a tablet in landscape. The old screen put a phone-width column in the middle of it.
 */
function StudentFrame({
  children,
  rail,
  tone = 'calm',
}: {
  readonly children: React.ReactNode
  /** The look-only twelve. Absent before a Student has a seat to be anywhere in. */
  readonly rail?: React.ReactNode
  /** A warning takes the whole screen, and the surface changes with it (ADR-0025). */
  readonly tone?: 'calm' | 'warning'
}) {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-canvas min-[46rem]:flex-row">
      {rail}
      <main
        id="content"
        tabIndex={-1}
        className={cn(
          'flex min-w-0 flex-1 flex-col justify-center gap-6 p-6 min-[48rem]:p-10',
          tone === 'warning' && 'bg-status-fault/10',
        )}
      >
        {/*
         * No Switch role here, and nothing else that leaves. It was two taps from a child to
         * the Teacher's Land and Stop, which is the safety story this product tells a school.
         * A child leaves this app by closing the lid.
         */}
        {children}
      </main>
    </div>
  )
}

/**
 * Join an iPad to the Teacher's classroom by the shouted code, then pick a name.
 *
 * Same-machine tabs already share localStorage; loadClassroomByCode also pulls from
 * `/api/classroom` when Blob is configured (#628).
 */
function JoinClassroomDoor({
  onJoined,
}: {
  readonly onJoined: (session: ClassroomSession) => void
}) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const onJoinedRef = useRef(onJoined)
  onJoinedRef.current = onJoined

  // Same laptop: Teacher opens classroom → localStorage fills without typing a code.
  useEffect(() => {
    const existing = readClassroomSession()
    if (existing !== null) onJoinedRef.current(existing)
    return subscribeClassroom((next) => {
      if (next !== null) onJoinedRef.current(next)
    })
  }, [])

  return (
    <StudentFrame>
      <h1 className="m-0 font-display text-heading font-medium text-ink">Join the classroom</h1>
      <p className="m-0 max-w-[50ch] text-body text-ink-subtle">
        Ask your Teacher for the four-letter code on their board. You fly with the controller
        in your hands. This screen only tells you what to do.
      </p>
      <label className="flex max-w-xs flex-col gap-1">
        <span className="label">Classroom code</span>
        <input
          value={code}
          onChange={(event) =>
            setCode(normalizeClassroomCode(event.target.value))
          }
          maxLength={6}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="tnum min-h-14 rounded-pill border border-hairline bg-surface-1 px-4 font-display text-heading tracking-[0.2em] text-ink"
          placeholder="K7M2"
          aria-label="Classroom code"
        />
      </label>
      <button
        type="button"
        disabled={busy || code.length < 4}
        className="min-h-14 w-fit cursor-pointer rounded-pill border-0 bg-ink px-6 py-2 text-body font-medium text-canvas disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => {
          setBusy(true)
          setError(null)
          void loadClassroomByCode(code).then((session) => {
            setBusy(false)
            if (session === null) {
              setError(
                'No classroom with that code yet. On the Teacher board, open Lesson so the code is live, then tap Retry sync. Same laptop: switch role after the Teacher plans the Mission. You skip this screen.',
              )
              return
            }
            onJoined(session)
          })
        }}
      >
        {busy ? 'Joining…' : 'Join'}
      </button>
      {error !== null ? <p className="m-0 text-body text-status-not-ready">{error}</p> : null}
      <p className="m-0 text-value text-ink-muted">
        Waiting for the Teacher to open the classroom also works on a second tab of their
        laptop. The code is for iPads on the school Wi‑Fi.
      </p>
    </StudentFrame>
  )
}

/**
 * Who is at this tablet. Typed once, and this tablet remembers.
 *
 * A list of thirty names was the old answer and it was the wrong question: a child scanning a
 * roll for their own name is checking against memory, and the one that gets tapped is the one
 * near their thumb. Their own name typed on their own tablet cannot be somebody else's.
 *
 * The roll still travels with the session (ADR-0025), so a Teacher who has typed the class in
 * gets one tap instead of a keyboard. It is an offer, not the only way through.
 */
function WhatIsYourName({
  session,
  onSeated,
}: {
  readonly session: ClassroomSession
  readonly onSeated: (session: ClassroomSession, seat: ClassroomSeat) => void
}) {
  const [typedName, setTypedName] = useState('')
  const taken = new Set(session.seats.map((row) => row.name))
  const roster: readonly ClassroomRosterEntry[] = session.roster ?? []
  const roll = roster.filter((student) => !taken.has(student.name))

  const seatAs = (name: string, studentId?: string) => {
    const joined = joinClassroomAsStudent(session, name, Date.now(), studentId)
    onSeated(joined.session, joined.seat)
  }

  return (
    <StudentFrame>
      <h1 className="m-0 font-display text-summary font-medium text-ink">What is your name?</h1>

      <form
        className="flex max-w-md flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          if (typedName.trim() !== '') seatAs(typedName)
        }}
      >
        <input
          type="text"
          value={typedName}
          onChange={(event) => setTypedName(event.target.value)}
          className="min-h-16 rounded-surface border border-hairline bg-surface-1 px-4 font-display text-heading text-ink"
          aria-label="Your name"
          autoComplete="given-name"
        />
        <button
          type="submit"
          disabled={typedName.trim() === ''}
          className="min-h-16 w-full cursor-pointer rounded-surface border-0 bg-ink px-6 py-2 font-display text-heading font-medium text-canvas disabled:cursor-not-allowed disabled:opacity-50"
        >
          That is me
        </button>
        <p className="m-0 text-value text-ink-muted">Typed once. This tablet remembers you.</p>
      </form>

      {roll.length === 0 ? null : (
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 min-[48rem]:grid-cols-4">
          {roll.map((student) => (
            <li key={student.studentId}>
              <button
                type="button"
                onClick={() => seatAs(student.name, student.studentId)}
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
 * The last question: which aircraft is in your hands.
 *
 * Big number buttons, because the child is reading a number painted on a physical object
 * rather than recalling one. A Drone somebody already has is greyed out and cannot be tapped,
 * so two children cannot land on one, and `takeDroneSeat` refuses it as well: the greying is a
 * courtesy and the refusal is the defence.
 *
 * This is not one of the two pressable things in the app (ADR-0025). Ask to take off and
 * Understood are Mission presses, made while a Mission is under way; this is the join, and a
 * child who has not joined is not in the Mission yet.
 */
function WhichDroneAreYouHolding({
  session,
  seat,
  onSession,
}: {
  readonly session: ClassroomSession
  readonly seat: ClassroomSeat
  readonly onSession: (session: ClassroomSession) => void
}) {
  const grid = droneGrid(session)

  return (
    <StudentFrame>
      <StudentName name={seat.name} />
      <h1 className="m-0 font-display text-summary font-medium text-ink">
        Which Drone are you holding?
      </h1>

      {grid.length === 0 ? (
        <p className="m-0 max-w-[50ch] text-body text-ink-muted">
          Your teacher has not put any Drones in this lesson yet. Wait, and they will appear.
        </p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-3 gap-4 p-0 min-[48rem]:grid-cols-6">
          {grid.map((drone) => {
            /*
             * Taken by somebody else. A Drone held under this child's own name is theirs to
             * take back: swapping to a working iPad mints a new seat, and greying their own
             * craft out against them is how a broken tablet becomes a child who cannot fly.
             */
            const mine = canTakeDrone(session, seat.studentId, drone.droneId)
            const held = drone.takenBy !== null && !mine
            return (
              <li key={drone.droneId}>
                <button
                  type="button"
                  disabled={held}
                  onClick={() => onSession(takeDroneSeat(session, seat.studentId, drone.droneId))}
                  aria-label={
                    held ? `${drone.droneName}, taken by ${drone.takenBy}` : drone.droneName
                  }
                  className={cn(
                    'flex min-h-28 w-full flex-col items-center justify-center gap-1 rounded-surface border font-display',
                    held
                      ? 'cursor-not-allowed border-hairline bg-canvas text-ink-muted'
                      : 'cursor-pointer border-hairline bg-surface-1 text-ink hover:border-ink',
                  )}
                >
                  <span className="tnum text-summary font-medium">{drone.number}</span>
                  {/* Shape and word, never colour alone (ADR-0004). */}
                  <span className="text-value font-normal">
                    {held ? 'Taken' : drone.takenBy !== null ? 'Yours' : 'Free'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </StudentFrame>
  )
}

/**
 * Down, after having flown.
 *
 * Poster step 11 is "Return Home / Land Safely" and it is a phase with a screen of its own,
 * not a line at the bottom of another one. A Student who has just landed is being told what
 * to do with the aircraft in their hands, which is a different question from either the
 * brief or the flying screen.
 *
 * The Mission is over for them when the Teacher seals it, not when they land, so the score
 * only appears once there is one.
 */
function BackOnTheGround({
  session,
  seat,
  rail,
}: {
  readonly session: ClassroomSession
  readonly seat: ClassroomSeat
  readonly rail?: React.ReactNode
}) {
  const outcome = session.outcome ?? null

  if (outcome === null) {
    return (
      <StudentFrame rail={rail}>
        <IdentityLine seat={seat} />

        <h1 className="m-0 max-w-[24ch] font-display text-summary font-medium text-balance text-ink">
          You are down
        </h1>

        <p className="m-0 max-w-[60ch] text-body text-ink-subtle">
          Land gently on the pad your Teacher pointed out, then stand clear of the propellers
          and wait. Your Teacher closes the Mission when every Drone is down.
        </p>
      </StudentFrame>
    )
  }

  return (
    <StudentFrame rail={rail}>
      <IdentityLine seat={seat} />

      <h1 className="m-0 font-display text-heading font-medium text-ink">Mission complete</h1>

      <MissionScore session={session} outcome={outcome} />
    </StudentFrame>
  )
}

/**
 * The score, and the criteria the Scenario said it would judge.
 *
 * The score is the dominant figure once a Student is down, the way the objective was
 * before takeoff and the battery was in the air. It is the Teacher's sealed number read
 * back, never recomputed here: two arithmetics for one grade is one of them being wrong.
 *
 * Which criteria appear is the Scenario's answer and not this screen's. Delivery is not
 * judged on collisions and Inspection is not judged on a safe route, so listing all five
 * would show a child a red mark against work the brief never asked for.
 *
 * Not measured is printed as not measured. A criterion the board never had an opinion
 * about is not a fail, and a screen that quietly rounded it into one would be inventing a
 * reading (ADR-0007's rule, applied to a grade).
 */
function MissionScore({
  session,
  outcome,
}: {
  readonly session: ClassroomSession
  readonly outcome: MissionOutcome
}) {
  const judges =
    session.scenarioId === null ? [] : scenarioOrUnknown(session.scenarioId).judges

  return (
    <div className="flex flex-col gap-6">
      {outcome.score === null ? (
        <BigReading value="Not scored" name="Your score" quiet />
      ) : (
        <BigReading value={`${Math.round(outcome.score * 100)}%`} name="Your score" />
      )}

      {judges.length > 0 && (
        <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 min-[48rem]:grid-cols-2">
          {judges.map((criterion) => (
            <CriterionRow
              key={criterion}
              label={CRITERION_WORDS[criterion]}
              met={outcome.criteria[criterion] ?? null}
            />
          ))}
        </ul>
      )}

      {outcome.debrief === null ? null : (
        <p className="m-0 max-w-[60ch] text-body text-ink-subtle">{outcome.debrief}</p>
      )}
    </div>
  )
}

/** One judged criterion. Shape as well as colour, always (ADR-0004). */
function CriterionRow({
  label,
  met,
}: {
  readonly label: string
  readonly met: boolean | null
}) {
  return (
    <li
      className="flex min-h-11 items-start gap-3 rounded-sm border border-hairline bg-surface-1 px-3 py-2"
      aria-label={`${label}: ${met === null ? 'Not measured' : met ? 'Met' : 'Not met'}`}
    >
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm border text-label',
          met === true
            ? 'border-ink bg-ink text-canvas'
            : met === false
              ? 'border-status-not-ready text-status-not-ready'
              : 'border-hairline text-ink-muted',
        )}
      >
        {met === true ? '✓' : met === false ? '!' : '?'}
      </span>
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-display text-value font-medium text-ink">{label}</span>
        {met === null ? <span className="text-value text-ink-muted">Not measured</span> : null}
      </span>
    </li>
  )
}

/**
 * The screen while the craft is up.
 *
 * A Student looks at this for two seconds at a time, standing outside, between looks at the
 * aircraft. So one figure is large and the rest is small, and which figure is large changes
 * with what matters: the checkpoint while one is close, the battery otherwise. Nothing here
 * is pressable except acknowledging the Teacher, because the Students fly by hand and this
 * tablet has never been able to move an aircraft (ADR-0021).
 */
function FlyingScreen({
  session,
  seat,
  rail,
}: {
  readonly session: ClassroomSession
  readonly seat: ClassroomSeat
  readonly rail: React.ReactNode
}) {
  const { vitals, now } = useFleet()
  const mine = vitals.find((entry) => entry.droneId === seat.droneId) ?? null

  const left = pointsLeft(seat, session)
  const battery = mine?.batteryFraction ?? null
  const instruction = session.instructions.at(-1) ?? null

  /*
   * Every point reached and nobody has approved it yet. Its own screen rather than a line
   * on this one, because "wait" is the whole instruction at that moment.
   */
  if (left === 0) {
    return <TaskDone seat={seat} reached={(session.checkpoints ?? []).length} rail={rail} />
  }

  return (
    <StudentFrame rail={rail}>
      <IdentityLine seat={seat} />

      {/*
       * "3 left" leads, the map sits beside it, and the two readings are small at the
       * bottom. The screen used to lead with a battery percentage, which is a number rather
       * than an answer: what a Student wants from two metres away is how much is left to do.
       */}
      <div className="grid gap-8 min-[52rem]:grid-cols-[1fr_15rem] min-[52rem]:items-center">
        <div className="flex flex-col gap-3">
          <p className="m-0 label">Points still to reach</p>
          <p className="m-0 font-display text-summary font-medium text-ink">
            {left === null ? 'No points set' : `${left} left`}
          </p>

          <dl className="m-0 mt-2 flex flex-wrap gap-x-10 gap-y-3">
            <QuietReading
              name="Battery"
              value={battery === null ? null : `${Math.round(battery * 100)}%`}
            />
            {/*
             * The remaining time, not the limit. This read `12 min` for the whole period,
             * which is a fixed number wearing a countdown's name.
             */}
            <QuietReading name="Time left" value={studentClock(session, now).words} />
          </dl>
        </div>

        <MyMap session={session} seat={seat} />
      </div>

      {instruction ? <TeacherInstruction instruction={instruction} now={now} /> : null}
    </StudentFrame>
  )
}

/**
 * Where my craft is, where the Mission is, and where I must not go.
 *
 * The board's own Scope, read only: no view switch, no freeze, no ghost paths, no full
 * screen, no selection, and never another Student's craft. It is a picture, not an
 * instrument, and it is not one of the two things on this screen that can be pressed.
 *
 * Metres east and north of where the Fleet was set up. There is no GPS in this product and
 * there is deliberately no map tile behind this: a zone and a craft share one origin, so
 * "inside this polygon" stays true even when the origin is wrong.
 */
function MyMap({
  session,
  seat,
}: {
  readonly session: ClassroomSession
  readonly seat: ClassroomSeat
}) {
  const { snapshot } = useFleet()
  const mine = snapshot.state?.drones.find((drone) => drone.id === seat.droneId) ?? null

  if (mine === null) return null

  const checkpoints = session.checkpoints ?? []
  // Whichever ones the Drone proved it reached, in whatever order it reached them.
  const reached = new Set(seat.reachedCheckpointIds)

  return (
    <section className="flex flex-col gap-2" aria-labelledby="student-map">
      <h2 id="student-map" className="label m-0">
        Where you are
      </h2>
      <Scope
        drones={[mine]}
        zones={session.zones}
        checkpoints={checkpoints}
        reachedCheckpointIds={reached}
        readOnly
      />
    </section>
  )
}

/**
 * Out of place, across the whole width, or absent.
 *
 * Not one tile among six. A No-fly Zone is the only thing on this screen that must be seen
 * without being looked for, and the way a warning fails is that the eye stops noticing it,
 * so it is not drawn at all when there is nothing to say.
 */
function FlyingWarning({ breaches }: { readonly breaches: readonly AirspaceBreach[] }) {
  const worst = breaches[0]
  if (!worst) return null

  return (
    <p
      role="status"
      className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-surface border-l-4 border-status-fault bg-surface-1 px-4 py-3"
    >
      <span className="font-display text-heading font-medium text-status-fault">
        No-fly Zone
      </span>
      <span className="text-body text-ink">
        You are inside {worst.zoneName}. Come out the way you went in.
      </span>
    </p>
  )
}

/**
 * What to do about what is happening, in the Student's own words.
 *
 * The customer's "What if something happens" table is already in this repository as data:
 * `incident-playbook.ts` carries a title, what the craft is doing about it, what the team
 * should do, and how it ends, ordered by the five safety priorities. So this reads the
 * words rather than repeating them, and a row that drifts on the Teacher's console drifts
 * here in the same commit.
 *
 * Only live Alerts appear. A permanent table of everything that could go wrong is a poster
 * for the wall, not a screen a child glances at with a controller in their hands.
 */
export function WhatToDoNow({ alerts }: { readonly alerts: readonly VitalsAlert[] }) {
  const rows = byUrgency(alerts, (alert) => alert.kind)
    .map((alert) => playbookFor(alert.kind))
    .filter((entry): entry is PlaybookEntry => entry !== null)

  if (rows.length === 0) return null

  return (
    <section className="flex flex-col gap-2" aria-label="What to do now">
      {rows.map((entry) => (
        <div
          key={entry.kind}
          className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-surface border border-hairline bg-surface-1 px-4 py-3"
        >
          <span className="font-display text-body font-medium text-ink">{entry.title}</span>
          <span className="min-w-0 flex-1 text-body text-ink-subtle">{entry.teamDoes}</span>
        </div>
      ))}
    </section>
  )
}

/** The figure that matters right now, at the size it can be read from the flight line. */
function BigReading({
  value,
  name,
  quiet = false,
}: {
  readonly value: string
  readonly name: string
  readonly quiet?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="label">{name}</span>
      <span
        className={cn(
          'tnum font-display text-summary font-medium',
          quiet ? 'text-ink-muted' : 'text-ink',
        )}
      >
        {value}
      </span>
    </div>
  )
}

/** A reading that is only worth a glance. Null says so in words rather than showing a zero. */
function QuietReading({
  name,
  value,
}: {
  readonly name: string
  readonly value: string | null
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="label m-0">{name}</dt>
      <dd
        className={cn('tnum m-0 text-body', value === null ? 'text-ink-muted' : 'text-ink')}
      >
        {value ?? 'Not reporting'}
      </dd>
    </div>
  )
}

/**
 * What the Teacher just said, and the one button a Student has while flying.
 *
 * Acknowledging is a record, not a Command. It tells the Teacher the message landed, which
 * is the whole of what a radio call does in a real tower.
 */
function TeacherInstruction({
  instruction,
  now,
}: {
  readonly instruction: ClassroomInstruction
  readonly now: number
}) {
  const [seen, setSeen] = useState<string | null>(null)
  if (seen === instruction.id) return null

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-surface border border-brand bg-brand-wash px-4 py-3">
      <span className="label">Your Teacher</span>
      <span className="min-w-0 flex-1 text-body text-ink">{instruction.text}</span>
      <span className="tnum text-label text-ink-muted">{formatAge(Math.max(0, now - instruction.at))}</span>
      <button
        type="button"
        onClick={() => setSeen(instruction.id)}
        className="min-h-14 shrink-0 cursor-pointer rounded-pill border-0 bg-ink px-6 py-2 font-display text-body font-medium text-canvas"
      >
        Understood
      </button>
    </div>
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
  rail,
}: {
  readonly session: ClassroomSession
  readonly seat: ClassroomSeat
  readonly onSession: (session: ClassroomSession) => void
  readonly rail?: React.ReactNode
}) {
  return (
    <StudentFrame rail={rail}>
      <IdentityLine seat={seat} />

      <AmIConnected seat={seat} />

      <h1 className="m-0 max-w-[24ch] font-display text-summary font-medium text-balance text-ink">
        {session.objective.trim() === ''
          ? 'Your Teacher has not set the objective yet.'
          : session.objective}
      </h1>

      <MissionTerms session={session} />

      <PreFlightForMyCraft seat={seat} />

      <TakeoffAnswer seat={seat} session={session} onSession={onSession} />
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
        label={seat.droneName ?? 'Your Drone'}
        says={
          seat.droneId === null
            ? 'You do not have a Drone yet.'
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

/**
 * The name, large, for the whole lesson. This is the fix for a mistap.
 *
 * It was one thin grey line, on the reasoning that a Student knows their own name. They do;
 * what they do not know is which name the software thinks they are. A child looking at
 * somebody else's name for forty minutes will say so within a minute, and that is a better
 * correction than a PIN a ten year old has to remember. So it stays big and it stays put, on
 * every screen from joining to the score.
 */
function IdentityLine({ seat }: { readonly seat: ClassroomSeat }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <StudentName name={seat.name} />
      <span className="text-body text-ink-subtle">
        {seat.droneName === null ? 'No Drone yet' : seat.droneName}
      </span>
    </div>
  )
}

function StudentName({ name }: { readonly name: string }) {
  return <p className="m-0 font-display text-heading font-medium text-ink">{name}</p>
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
 * Asking for takeoff, and the Teacher's answer to it.
 *
 * The answer is the dominant thing on this screen while it is waited for, because it is the
 * only thing a Student is doing: standing at the flight line looking at a tablet, waiting to
 * be told. A badge in a corner would be read from two metres as nothing at all.
 *
 * Held is worded as an instruction and never as a refusal. A child who reads "denied" has
 * been told they did something wrong; a child who reads "wait, your Teacher is coming" has
 * been told what happens next, which is the true thing and the useful one.
 *
 * Asking is a record, not a Command (ADR-0021). Nothing here starts a motor; it puts the
 * Student in the Teacher's queue and the Teacher answers on their own board.
 */
function TakeoffAnswer({
  seat,
  session,
  onSession,
}: {
  readonly seat: ClassroomSeat
  readonly session: ClassroomSession
  readonly onSession: (session: ClassroomSession) => void
}) {
  if (seat.droneId === null) return null

  if (seat.phase === 'awaiting-clearance') {
    return (
      <AnswerPanel
        heading="Waiting for your Teacher"
        says="Stand by your Drone. Do not take off until this says cleared."
        tone="waiting"
      />
    )
  }

  if (seat.phase === 'cleared' || seat.clearedAt !== null) {
    return (
      <AnswerPanel
        heading="Cleared for takeoff"
        says="Your Teacher has cleared you. Take off when your team is ready."
        tone="cleared"
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {seat.heldAt === null ? null : (
        <AnswerPanel
          heading="Hold for now"
          says="Your Teacher wants you to wait. Ask again when they say so."
          tone="held"
        />
      )}
      <button
        type="button"
        onClick={() => onSession(requestTakeoff(session, seat.studentId))}
        className="min-h-16 w-full cursor-pointer rounded-surface border-0 bg-ink px-6 py-4 font-display text-heading font-medium text-canvas min-[48rem]:w-fit"
      >
        Ask to take off
      </button>
    </div>
  )
}

/**
 * The answer, at the size the phase deserves.
 *
 * Full bleed and `text-summary`, because between asking and being cleared this is the whole
 * screen as far as the Student is concerned. Word and shape carry the state; the colour is
 * the third channel and never the only one (ADR-0004).
 */
function AnswerPanel({
  heading,
  says,
  tone,
}: {
  readonly heading: string
  readonly says: string
  readonly tone: 'waiting' | 'cleared' | 'held'
}) {
  return (
    <section
      role="status"
      className={cn(
        'flex flex-col gap-2 rounded-surface border-l-4 px-6 py-5',
        tone === 'cleared' && 'border-status-ready bg-surface-1',
        tone === 'waiting' && 'border-hairline bg-surface-1',
        tone === 'held' && 'border-status-not-ready bg-surface-1',
      )}
    >
      <p className="m-0 font-display text-summary font-medium text-balance text-ink">
        {heading}
      </p>
      <p className="m-0 text-body text-ink-subtle">{says}</p>
    </section>
  )
}

/**
 * The Mission clock, from the same module the Teacher's board reads.
 *
 * The session carries the start and the limit rather than the Mission itself, so this
 * builds the smallest Mission the clock needs. Before the Mission starts the clock says so
 * rather than counting down from nothing.
 */
function studentClock(session: ClassroomSession, now: number) {
  return missionClock(
    {
      ...emptyMission('student-clock', session.scenarioId ?? 'search-rescue', ''),
      startedAt: session.missionStartedAt ?? null,
      limitMinutes: session.limitMinutes > 0 ? session.limitMinutes : null,
    },
    now,
  )
}
