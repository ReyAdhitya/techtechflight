import type { DroneId, LocalPosition } from '@techtechflight/contract'
import type { MissionCheckpoint, MissionOutcome, ScenarioId } from './mission.ts'
import { hasReached } from './mission.ts'
import type { Zone } from './airspace.ts'

/**
 * Shared classroom state between the Teacher board and Student phones (#628).
 *
 * Local first (this laptop / this tab). When `/api/classroom` answers, a copy goes to
 * Vercel Blob keyed by the classroom code so phones on another network can join.
 * BroadcastChannel keeps two tabs on one machine honest without a round trip.
 */

export const CLASSROOM_SESSION_KEY = 'techtechflight:classroom-session'
export const CLASSROOM_CHANNEL = 'techtechflight:classroom'
export const STUDENT_SEAT_KEY = 'techtechflight:student-seat'

export type StudentMissionPhase =
  | 'briefing'
  | 'objective'
  | 'prepare'
  | 'connect'
  | 'request-takeoff'
  | 'awaiting-clearance'
  | 'held'
  | 'cleared'
  | 'flying'
  | 'returning'
  | 'complete'

export interface ClassroomInstruction {
  readonly id: string
  readonly at: number
  readonly text: string
  readonly kind: 'info' | 'new-target' | 'recall' | 'hold'
}

export interface ClassroomSeat {
  readonly studentId: string
  readonly name: string
  readonly droneId: DroneId | null
  readonly droneName: string | null
  readonly phase: StudentMissionPhase
  readonly takeoffRequestedAt: number | null
  readonly clearedAt: number | null
  readonly heldAt: number | null
  /**
   * When this craft was first seen off the ground.
   *
   * Written from Telemetry, never from a press, and never cleared. It is what separates a
   * Student who has landed from one who is cleared and still standing on the pad, which a
   * clearance alone cannot tell you.
   */
  readonly flownAt: number | null
  /**
   * Which points this Drone has reached, by id, **in any order**.
   *
   * A list rather than a count, because the order is not the lesson: a Student flying by
   * hand goes to whichever point is nearest, and an index would call that a failure. It is
   * written from Telemetry on the Teacher's board when the Drone proves it was there, so
   * nobody can claim a point they did not fly to.
   */
  readonly reachedCheckpointIds: readonly string[]
  /**
   * When the Teacher approved the finished task, or null.
   *
   * The Teacher's answer, not the Student's: the Approve button cannot appear until every
   * point is reached, and pressing it is what starts the way down.
   */
  readonly approvedAt: number | null
  readonly score: number | null
  readonly joinedAt: number
  /**
   * When this seat's tablet last said it was there, or null when there is no tablet.
   *
   * Null is the honest reading for a child the Teacher seated by hand: they are flying with
   * no screen, and a board that reported them as "not heard from" would be raising an alarm
   * about a decision the Teacher made on purpose. A seat that has checked in once and gone
   * quiet is the case worth saying out loud.
   */
  readonly seenAt?: number | null
}

/** Names the Student tablet can pick without reading the Teacher's Logbook. */
export interface ClassroomRosterEntry {
  readonly studentId: string
  readonly name: string
}

/**
 * A Drone in this Lesson, as a child sees it: **the number painted on the aircraft**.
 *
 * The tablet offers these rather than a class list of thirty names, because the thing a
 * ten year old is checking against is a physical object in their hands. Six large buttons
 * beat thirty small ones, and two children reaching for Drone 3 are standing next to each
 * other and find out in a second.
 */
export interface ClassroomDrone {
  readonly droneId: DroneId
  readonly droneName: string
  /** What is on the airframe. Sorted by this, so the grid reads 1, 2, 3 and not by id. */
  readonly number: number
}

/**
 * A team, as a child needs to hear it: a name attached to a craft.
 *
 * Only the name and the Drone travel. Who is in the team is the Teacher's Logbook business,
 * and a tablet that carried a class list of thirty names would be carrying a class list of
 * thirty names.
 */
export interface ClassroomTeam {
  readonly id: string
  readonly name: string
  readonly droneId: DroneId | null
}

/**
 * The number a Teacher would read off the aircraft.
 *
 * From the name first, because that is what the board and the child both say out loud, and
 * from the id when a Fleet names its craft something else. Zero when neither carries a
 * number, which sorts such a Drone to the front rather than dropping it off the grid.
 */
export function droneNumber(droneName: string, droneId: string): number {
  const fromName = /(\d+)\s*$/.exec(droneName.trim())
  if (fromName) return Number(fromName[1])
  const fromId = /(\d+)\s*$/.exec(droneId.trim())
  return fromId ? Number(fromId[1]) : 0
}

/** Which seat, if any, is on this Drone. */
export function seatOnDrone(
  session: ClassroomSession,
  droneId: DroneId,
): ClassroomSeat | null {
  return session.seats.find((seat) => seat.droneId === droneId) ?? null
}

/**
 * The Drone grid a joining Student sees: every craft in the Lesson, and who has it.
 *
 * A Drone already taken is greyed out and untappable on the tablet, which is what stops two
 * children landing on one. The known hole is accepted: a child can take the Drone of a
 * classmate who is absent, because nobody is competing for it. The Teacher's board showing an
 * absent child suddenly flying is the check.
 */
export function droneGrid(
  session: ClassroomSession,
): readonly (ClassroomDrone & { readonly takenBy: string | null })[] {
  return [...(session.drones ?? [])]
    .sort((a, b) => a.number - b.number)
    .map((drone) => ({ ...drone, takenBy: seatOnDrone(session, drone.droneId)?.name ?? null }))
}

/**
 * Who is flying this Drone, for the one question that turns on it: may it take off.
 *
 * The seat a child took on their own tablet first, and the Teacher's Logbook assignment as
 * the fallback. Two callers ask this — the clearance queue and the rail's count of it — and
 * two rules for who counts as a Student would make them disagree in front of a class.
 *
 * Null is the answer that matters. **No Student, no takeoff**: a Drone in the Lesson with
 * nobody on it never enters the queue, because in a real classroom a Drone with no child
 * holding a controller does not fly. A Teacher's hand-seat is a classroom seat, so a child
 * flying with no tablet counts here exactly as they do in the room.
 */
export function studentOnDrone(
  session: ClassroomSession | null,
  droneId: DroneId,
  assigned: string | null = null,
): string | null {
  const seat = session === null ? null : seatOnDrone(session, droneId)
  return seat?.studentId ?? assigned
}

/** The same grid with the seat itself, for the Teacher's board. */
export function classroomRows(
  session: ClassroomSession,
): readonly (ClassroomDrone & { readonly seat: ClassroomSeat | null })[] {
  return [...(session.drones ?? [])]
    .sort((a, b) => a.number - b.number)
    .map((drone) => ({ ...drone, seat: seatOnDrone(session, drone.droneId) }))
}

/** Children who have joined and not taken a Drone yet. The Teacher's board still counts them. */
export function seatsWithoutADrone(session: ClassroomSession): readonly ClassroomSeat[] {
  return session.seats.filter((seat) => seat.droneId === null)
}

/**
 * Who else is in the room, from one child's point of view.
 *
 * **My team named, and everybody else smaller underneath.** A child at a flight line looks up
 * and wants to know who is flying, and the answer they care about most is their own team's
 * name: it is the thing a Teacher shouts across a hall, and a child who cannot match it to
 * themselves is a child who does not know when they are being spoken to.
 *
 * The team is found by the Drone rather than by matching roster ids, because the Drone is the
 * one thing both halves agree on: a Teacher puts a team on a craft at step 3, and a child taps
 * the number painted on the craft in their hands. Ids only line up when a child joined by
 * tapping their name off the roll, which is the lucky case rather than the ordinary one.
 */
export function roomAround(
  session: ClassroomSession,
  studentId: string,
): {
  readonly teamName: string | null
  readonly mine: ClassroomSeat | null
  readonly others: readonly ClassroomSeat[]
} {
  const mine = session.seats.find((seat) => seat.studentId === studentId) ?? null
  const teamName =
    mine?.droneId == null
      ? null
      : ((session.teams ?? []).find((team) => team.droneId === mine.droneId)?.name ?? null)

  return {
    teamName,
    mine,
    others: session.seats
      .filter((seat) => seat.studentId !== studentId)
      .slice()
      .sort((a, b) => a.joinedAt - b.joinedAt),
  }
}

/**
 * A Student takes the Drone they are holding.
 *
 * Refuses a Drone somebody else already has, so the tablet's greying out is a courtesy rather
 * than the whole defence: two children tapping the same number in the same second must not
 * both end up on it. Taking a second Drone gives up the first, because a child has one pair of
 * hands.
 */
export function takeDroneSeat(
  session: ClassroomSession,
  studentId: string,
  droneId: DroneId,
): ClassroomSession {
  const drone = (session.drones ?? []).find((row) => row.droneId === droneId)
  if (drone === undefined) return session
  const taker = session.seats.find((row) => row.studentId === studentId)
  if (taker === undefined) return session

  const held = seatOnDrone(session, droneId)
  const mine = held !== null && held.studentId === studentId
  const reclaiming = held !== null && !mine && sameChild(held.name, taker.name)
  if (held !== null && !mine && !reclaiming) return session

  return writeClassroomSession({
    ...session,
    seats: session.seats
      // Reclaiming: the old seat was this child on a device that died. Dropping it rather
      // than leaving a nameless twin is what makes the row on the Teacher's board read as
      // one child, which is what it is.
      .filter((seat) => !(reclaiming && seat.studentId === held.studentId))
      .map((seat) =>
        seat.studentId === studentId
          ? { ...seat, droneId: drone.droneId, droneName: drone.droneName }
          : seat,
      ),
  })
}

/**
 * Whether two seats are the same child.
 *
 * By name, because a Student who picks up a second iPad gets a second `studentId` and their
 * own Drone would otherwise be greyed out against them forever. Two children with the same
 * first name in one class is the case this gets wrong, and it gets it wrong in the direction
 * the Teacher can see: the board shows one row where they expected two.
 */
function sameChild(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase()
}

/**
 * Whether this seat can reclaim a Drone somebody appears to be holding.
 *
 * The tablet greys out a taken Drone. It must not grey out the child's own, on the morning
 * their iPad is swapped for a working one.
 */
export function canTakeDrone(
  session: ClassroomSession,
  studentId: string,
  droneId: DroneId,
): boolean {
  const held = seatOnDrone(session, droneId)
  if (held === null) return true
  if (held.studentId === studentId) return true
  const taker = session.seats.find((row) => row.studentId === studentId)
  return taker !== undefined && sameChild(held.name, taker.name)
}

/**
 * The Teacher puts a child on a Drone by hand: tap the Drone, type the name.
 *
 * A broken iPad must not stop a child flying, and a Teacher taking responsibility out loud is
 * what actually happens in a room when technology fails. The child simply cannot see their own
 * screen, which is a smaller loss than not flying.
 *
 * **The Teacher's change wins.** A Drone somebody else has taken is reassigned rather than
 * refused: the Teacher is three metres away looking at both children, and the software is not.
 */
export function seatStudentByHand(
  session: ClassroomSession,
  droneId: DroneId,
  name: string,
  now = Date.now(),
): ClassroomSession {
  const drone = (session.drones ?? []).find((row) => row.droneId === droneId)
  if (drone === undefined) return session
  const trimmed = name.trim()
  if (trimmed === '') return session

  const held = seatOnDrone(session, droneId)
  if (held !== null) {
    return writeClassroomSession({
      ...session,
      seats: session.seats.map((seat) =>
        seat.studentId === held.studentId ? { ...seat, name: trimmed } : seat,
      ),
    })
  }

  const seat: ClassroomSeat = {
    studentId: `hand-${droneId}-${now.toString(36)}`,
    name: trimmed,
    droneId: drone.droneId,
    droneName: drone.droneName,
    phase: 'briefing',
    takeoffRequestedAt: null,
    clearedAt: null,
    heldAt: null,
    flownAt: null,
    reachedCheckpointIds: [],
    approvedAt: null,
    score: null,
    joinedAt: now,
  }
  return writeClassroomSession({ ...session, seats: [...session.seats, seat] })
}

/**
 * Free a Drone in one tap.
 *
 * The seat goes rather than merely giving up the craft, because the reason a Teacher presses
 * this is that the child is not there: an iPad that died, a child sent to the office, a
 * mistap. A seat holding a Drone nobody is flying is the thing that stops the next child
 * taking it. If the tablet is alive it rejoins by the name it remembers, and is asked which
 * Drone it is holding, which is the honest question.
 */
export function freeDroneSeat(session: ClassroomSession, droneId: DroneId): ClassroomSession {
  const held = seatOnDrone(session, droneId)
  if (held === null) return session
  return writeClassroomSession({
    ...session,
    seats: session.seats.filter((seat) => seat.studentId !== held.studentId),
  })
}

export interface ClassroomSession {
  readonly code: string
  readonly openedAt: number
  readonly updatedAt: number
  readonly lessonId: string | null
  readonly lessonLabel: string
  readonly scenarioId: ScenarioId | null
  readonly scenarioName: string
  readonly objective: string
  readonly rules: readonly string[]
  readonly limitMinutes: number
  readonly checkpointCount: number
  /**
   * When the Mission started, so a Student's clock is the same clock the Teacher reads.
   * Null before the first clearance; the session is not live then either.
   */
  readonly missionStartedAt?: number | null
  /** The checkpoints themselves, so a Student's map can draw them in the Mission's order. */
  readonly checkpoints?: readonly MissionCheckpoint[]
  /**
   * How the Mission was judged, once the Teacher has sealed it.
   *
   * Copied onto the session rather than looked up in the Logbook, because the Logbook is
   * the Teacher's record and this document is what a Student's tablet reads. Null until
   * the Teacher confirms the Mission complete: a score before then would be a guess.
   */
  readonly outcome?: MissionOutcome | null
  /**
   * Class roll copied onto the session so an iPad can offer names without the Logbook.
   * Absent on older sessions — the tablet then falls back to typing a name.
   */
  readonly roster?: readonly ClassroomRosterEntry[]
  /**
   * The craft in this Lesson, by the number painted on them.
   *
   * How a Student gets on a Drone: they tap the number in their hands. Absent on a session
   * written before this existed, and on one whose Teacher has not put teams on craft yet, in
   * which case the tablet says so rather than showing an empty grid.
   */
  readonly drones?: readonly ClassroomDrone[]
  /**
   * The teams, by name and craft, so a child can be told which one is theirs.
   *
   * Absent on a session written before this existed and on a Lesson with no teams named, in
   * which case the tablet says nothing about teams rather than inventing one.
   */
  readonly teams?: readonly ClassroomTeam[]
  readonly zones: readonly Zone[]
  readonly seats: readonly ClassroomSeat[]
  readonly instructions: readonly ClassroomInstruction[]
  /** Mission under way — Students may progress past briefing. */
  readonly live: boolean
  /**
   * When the Teacher's board last said it was there.
   *
   * The tablet's half of the heartbeat. Without it a child whose iPad has lost the Wi-Fi sees
   * the last numbers the board sent, held and frozen, and cannot tell them from live ones.
   * That is the rule about absent readings applied to a whole screen.
   */
  readonly boardSeenAt?: number | null
  /**
   * When the Lesson this classroom belongs to ended, or null while it is running.
   *
   * The only thing that makes an old session **provably** dead rather than merely quiet. The
   * owner opened the Student app on an iPhone and found it sitting in a lesson called
   * "bleble" that had finished weeks earlier, because nothing had ever said it was over and
   * nothing could ever have said so.
   */
  readonly endedAt?: number | null
}

export interface StudentSeatLocal {
  readonly code: string
  readonly studentId: string
  readonly name: string
}

function emptySession(code: string, now: number): ClassroomSession {
  return {
    code,
    openedAt: now,
    updatedAt: now,
    lessonId: null,
    lessonLabel: '',
    scenarioId: null,
    scenarioName: '',
    objective: '',
    rules: [],
    limitMinutes: 20,
    checkpointCount: 5,
    missionStartedAt: null,
    checkpoints: [],
    outcome: null,
    roster: [],
    drones: [],
    teams: [],
    zones: [],
    seats: [],
    instructions: [],
    live: false,
    boardSeenAt: null,
    endedAt: null,
  }
}

/**
 * How long silence lasts before it is worth saying out loud.
 *
 * Forty seconds, which is the owner's own number and about four missed heartbeats. Shorter
 * and a lesson is a stream of warnings every time an iPad's radio hiccups; longer and a child
 * whose tablet died is invisible for the part of the lesson where it matters.
 */
export const QUIET_AFTER_MS = 40_000

/** How often each side says it is still there. Comfortably inside {@link QUIET_AFTER_MS}. */
export const HEARTBEAT_EVERY_MS = 10_000

/**
 * The Teacher's board says it is still there.
 *
 * Reads the session fresh rather than taking one handed in, because this runs on a timer and
 * whatever the caller was holding a moment ago may be a Student's write that has just landed.
 * Every classroom-session writer starts from the session it is handed; this one has to fetch
 * its own.
 */
export function touchBoard(now = Date.now()): ClassroomSession | null {
  const session = readClassroomSession()
  if (session === null) return null
  return writeClassroomSession({ ...session, boardSeenAt: now })
}

/** This seat's tablet says it is still there. Same freshness rule as {@link touchBoard}. */
export function touchSeat(studentId: string, now = Date.now()): ClassroomSession | null {
  const session = readClassroomSession()
  if (session === null) return null
  if (!session.seats.some((seat) => seat.studentId === studentId)) return null
  return writeClassroomSession({
    ...session,
    seats: session.seats.map((seat) =>
      seat.studentId === studentId ? { ...seat, seenAt: now } : seat,
    ),
  })
}

/**
 * Seats whose tablet has gone quiet, worst first.
 *
 * A seat that has never checked in is not here: that is a child the Teacher put on a Drone by
 * hand, and they were never going to check in.
 */
export function quietSeats(
  session: ClassroomSession,
  now: number,
): readonly (ClassroomSeat & { readonly quietForMs: number })[] {
  return session.seats
    .filter((seat) => (seat.seenAt ?? null) !== null && now - seat.seenAt! >= QUIET_AFTER_MS)
    .map((seat) => ({ ...seat, quietForMs: now - seat.seenAt! }))
    .sort((a, b) => b.quietForMs - a.quietForMs)
}

/**
 * How long since the Teacher's board said anything, or null when it never has.
 *
 * Null on a session written before the heartbeat existed, and on one a Student loaded from
 * the cloud before the Teacher's board had ticked once. Neither is a lost board, and saying
 * so would be the tablet inventing bad news.
 */
export function boardQuietForMs(session: ClassroomSession, now: number): number | null {
  const seen = session.boardSeenAt ?? null
  if (seen === null) return null
  const quiet = now - seen
  return quiet >= QUIET_AFTER_MS ? quiet : null
}

/** Four-character classroom code — short enough to shout across a room. */
export function mintClassroomCode(now = Date.now()): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  // Force unsigned so `%` never goes negative (JS keeps sign on remainder).
  let n = (now ^ Math.floor(Math.random() * 0xffff)) >>> 0
  for (let i = 0; i < 4; i += 1) {
    out += alphabet[n % alphabet.length]!
    n = Math.floor(n / alphabet.length) + (i + 1) * 17
  }
  return out
}

export function normalizeClassroomCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

export function readClassroomSession(): ClassroomSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CLASSROOM_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ClassroomSession
    if (!parsed || typeof parsed.code !== 'string') return null
    return withSeatDefaults(parsed)
  } catch {
    return null
  }
}

/**
 * Fields a session written before them does not carry.
 *
 * A lesson left open across a deploy is the ordinary case, not an edge one, and an absent
 * list read as `undefined` would throw on the first `.includes`. Absent means none reached
 * and nobody approved, which is what a Mission that has not started looks like anyway.
 */
function withSeatDefaults(session: ClassroomSession): ClassroomSession {
  return {
    ...session,
    seats: session.seats.map((seat) => ({
      ...seat,
      reachedCheckpointIds: seat.reachedCheckpointIds ?? [],
      approvedAt: seat.approvedAt ?? null,
      seenAt: seat.seenAt ?? null,
    })),
  }
}

export function writeClassroomSession(session: ClassroomSession): ClassroomSession {
  if (typeof window === 'undefined') return session
  const next = { ...session, updatedAt: Date.now() }
  try {
    window.localStorage.setItem(CLASSROOM_SESSION_KEY, JSON.stringify(next))
    broadcastClassroom(next)
  } catch {
    /* ignore */
  }
  // Immediate push so an iPad that joins within a second of the Teacher opening still
  // finds the code; the debounced schedule covers rapid follow-up edits.
  void pushClassroomToCloud(next)
  scheduleClassroomCloudPush(next)
  return next
}

export function openClassroom(input: {
  readonly code?: string
  readonly lessonId: string | null
  readonly lessonLabel: string
  readonly scenarioId: ScenarioId | null
  readonly scenarioName: string
  readonly objective: string
  readonly rules: readonly string[]
  readonly limitMinutes: number
  /** How many checkpoints this Mission has. Absent keeps whatever the session already had. */
  readonly checkpointCount?: number
  readonly missionStartedAt?: number | null
  readonly checkpoints?: readonly MissionCheckpoint[]
  /** The sealed outcome, once there is one. Absent leaves whatever the session already had. */
  readonly outcome?: MissionOutcome | null
  /** Class roll for Student tablets. Absent keeps whatever the session already had. */
  readonly roster?: readonly ClassroomRosterEntry[]
  /** The craft in the Lesson, for the join grid. Absent keeps whatever was already there. */
  readonly drones?: readonly ClassroomDrone[]
  /** The teams, by name and craft. Absent keeps whatever was already there. */
  readonly teams?: readonly ClassroomTeam[]
  readonly zones: readonly Zone[]
  readonly live?: boolean
  readonly now?: number
}): ClassroomSession {
  const now = input.now ?? Date.now()
  const existing = readClassroomSession()

  /*
   * **A new Lesson mints a new code, and the old one stops working.**
   *
   * This read `input.code ?? existing?.code ?? mint(now)`, so the first code a board ever
   * minted was reused for every lesson after it, forever. Last week's code opened today's
   * class, which is how an iPhone came to be sitting in a finished lesson called "bleble"
   * with nothing able to tell it otherwise: a tablet could not distinguish today from last
   * month, because the two were the same document under the same code.
   *
   * A dead code is what makes a dead session *provable* rather than merely quiet. Keyed on
   * the Lesson rather than on time, because a Teacher who reloads the board mid-lesson must
   * not find the code they read out has changed under thirty children.
   */
  const carriesOn = existing !== null && existing.lessonId === input.lessonId
  const code = normalizeClassroomCode(
    input.code ?? (carriesOn ? existing.code : mintClassroomCode(now)),
  )
  const base = carriesOn && existing.code === code ? existing : emptySession(code, now)
  return writeClassroomSession({
    ...base,
    code,
    // A classroom being opened is a classroom that has not ended, whatever the last one did.
    endedAt: null,
    lessonId: input.lessonId,
    lessonLabel: input.lessonLabel,
    scenarioId: input.scenarioId,
    scenarioName: input.scenarioName,
    objective: input.objective,
    rules: input.rules,
    limitMinutes: input.limitMinutes,
    checkpointCount: input.checkpointCount ?? base.checkpointCount,
    missionStartedAt: input.missionStartedAt ?? base.missionStartedAt ?? null,
    checkpoints: input.checkpoints ?? base.checkpoints ?? [],
    outcome: input.outcome ?? base.outcome ?? null,
    roster: input.roster ?? base.roster ?? [],
    drones: input.drones ?? base.drones ?? [],
    teams: input.teams ?? base.teams ?? [],
    zones: input.zones,
    live: input.live ?? true,
    updatedAt: now,
  })
}

/**
 * The Lesson is over, so the classroom is over. Said out loud, to the tablets.
 *
 * Written and pushed rather than merely forgotten, because forgetting is what left an iPhone
 * in a finished lesson: a tablet on another device holds its own copy and polls the cloud by
 * the code it already has, so the only way it can ever learn the truth is for the truth to be
 * written into the document it is reading.
 *
 * The seats stay. A Teacher closing a Lesson has not un-taught it, and the last thing the
 * board recorded about who flew what is worth more than a tidy empty list.
 */
export function closeClassroom(now = Date.now()): ClassroomSession | null {
  const session = readClassroomSession()
  if (session === null || (session.endedAt ?? null) !== null) return session
  return writeClassroomSession({ ...session, endedAt: now, live: false })
}

/** Whether this classroom is provably over, rather than merely quiet. */
export function classroomHasEnded(session: ClassroomSession | null): boolean {
  return session !== null && (session.endedAt ?? null) !== null
}

/**
 * This tablet leaves the classroom.
 *
 * Forgets the seat and the session copy on **this device only**: it is a tablet walking out
 * of a room, not a Teacher deleting a record, and the board's own session is untouched.
 *
 * There was no way to do this at all. Once a device joined it was joined forever, which is
 * the whole of why an iPhone sat in a lesson that had finished weeks earlier.
 *
 * **This is not one of ADR-0025's two presses.** Those are Mission presses, made while a
 * Mission is under way: Ask to take off, and Understood. Joining is not one of them either,
 * for the reason already written in `WhichDroneAreYouHolding`, and leaving sits in the same
 * category. Nothing here reaches an aircraft.
 */
export function leaveClassroom(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STUDENT_SEAT_KEY)
    window.localStorage.removeItem(CLASSROOM_SESSION_KEY)
  } catch {
    /* ignore */
  }
}

export function readStudentSeatLocal(): StudentSeatLocal | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STUDENT_SEAT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StudentSeatLocal
  } catch {
    return null
  }
}

export function writeStudentSeatLocal(seat: StudentSeatLocal | null): void {
  if (typeof window === 'undefined') return
  try {
    if (seat === null) window.localStorage.removeItem(STUDENT_SEAT_KEY)
    else window.localStorage.setItem(STUDENT_SEAT_KEY, JSON.stringify(seat))
  } catch {
    /* ignore */
  }
}

export function joinClassroomAsStudent(
  session: ClassroomSession,
  name: string,
  now = Date.now(),
  studentId?: string,
): { readonly session: ClassroomSession; readonly seat: ClassroomSeat } {
  const trimmed = name.trim() || 'Student'
  const preferredId = studentId?.trim() || null
  const local = readStudentSeatLocal()
  const existing =
    (preferredId !== null
      ? session.seats.find((row) => row.studentId === preferredId)
      : undefined) ??
    (local && local.code === session.code
      ? session.seats.find((row) => row.studentId === local.studentId)
      : undefined)

  if (existing) {
    const seat = { ...existing, name: trimmed }
    const seats = session.seats.map((row) => (row.studentId === seat.studentId ? seat : row))
    const next = writeClassroomSession({ ...session, seats })
    writeStudentSeatLocal({ code: session.code, studentId: seat.studentId, name: trimmed })
    return { session: next, seat }
  }

  const seat: ClassroomSeat = {
    studentId:
      preferredId ?? `stu-${now.toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`,
    name: trimmed,
    droneId: null,
    droneName: null,
    phase: 'briefing',
    takeoffRequestedAt: null,
    clearedAt: null,
    heldAt: null,
    flownAt: null,
    reachedCheckpointIds: [],
    approvedAt: null,
    score: null,
    joinedAt: now,
  }

  /*
   * No Drone yet, deliberately. Joining answers "who is at this tablet"; the Drone is the
   * next question and the child answers it by tapping the number in their hands. Auto-seating
   * onto the next free craft was tried here and is exactly the mistap the join flow exists to
   * prevent: a child who is handed Drone 4 by the software goes and picks up Drone 4.
   */
  const next = writeClassroomSession({ ...session, seats: [...session.seats, seat] })
  writeStudentSeatLocal({ code: session.code, studentId: seat.studentId, name: trimmed })
  return { session: next, seat }
}

export function assignSeatCraft(
  session: ClassroomSession,
  studentId: string,
  droneId: DroneId,
  droneName: string,
): ClassroomSession {
  return writeClassroomSession({
    ...session,
    seats: session.seats.map((row) =>
      row.studentId === studentId ? { ...row, droneId, droneName } : row,
    ),
  })
}

/**
 * Whether this seat's craft has been off the ground.
 *
 * Tolerates a seat written before `flownAt` existed: a session sits in `localStorage`
 * across a reload, and a missing field read as "has flown" would put a Student who never
 * left the pad on the landed screen.
 */
export function seatHasFlown(seat: ClassroomSeat): boolean {
  return (seat.flownAt ?? null) !== null
}

/** Record that this craft has left the ground. Idempotent; the first sighting wins. */
export function markSeatFlown(
  session: ClassroomSession,
  studentId: string,
  now = Date.now(),
): ClassroomSession {
  const seat = session.seats.find((row) => row.studentId === studentId)
  if (seat === undefined || seatHasFlown(seat)) return session
  return updateSeatPhase(session, studentId, 'flying', { flownAt: now })
}

/**
 * Points a Drone at this position has reached, by id, in any order.
 *
 * Pure geometry over `hasReached`, which is generous on purpose: a Student flying by hand
 * cannot hit a point, and a checkpoint that demanded precision would be measuring the
 * controller rather than the lesson.
 */
export function pointsReachedAt(
  checkpoints: readonly MissionCheckpoint[],
  position: LocalPosition | null,
): readonly string[] {
  if (position === null) return []
  return checkpoints.filter((point) => hasReached(point, position)).map((point) => point.id)
}

/**
 * Tick off whatever this Drone has just proved it reached.
 *
 * Written from the Teacher's board, because that is where the Telemetry is, and never from
 * a press: nobody can claim a point they did not fly to. Returns the session unchanged when
 * nothing is new, so the caller can run it on every tick without writing on every tick.
 */
export function markPointsReached(
  session: ClassroomSession,
  droneId: DroneId,
  reachedIds: readonly string[],
  now = Date.now(),
): ClassroomSession {
  if (reachedIds.length === 0) return session

  let changed = false
  const seats = session.seats.map((seat) => {
    if (seat.droneId !== droneId) return seat
    const fresh = reachedIds.filter((id) => !seat.reachedCheckpointIds.includes(id))
    if (fresh.length === 0) return seat
    changed = true
    return { ...seat, reachedCheckpointIds: [...seat.reachedCheckpointIds, ...fresh] }
  })

  if (!changed) return session
  void now
  return writeClassroomSession({ ...session, seats })
}

/** Whether this seat's Drone has reached every point the Mission requires. */
export function allPointsReached(
  seat: ClassroomSeat,
  checkpoints: readonly MissionCheckpoint[],
): boolean {
  const required = checkpoints.filter((point) => point.required)
  if (required.length === 0) return false
  return required.every((point) => seat.reachedCheckpointIds.includes(point.id))
}

/**
 * The Teacher approves a finished task, and the way down begins.
 *
 * One tap, and it is the Teacher's alone: the Student's app still has exactly two pressable
 * things (ADR-0025). Refuses a seat that has not reached every point, so the button cannot
 * approve a team that did not fly it even if a caller offers it early.
 */
export function approveSeatTask(
  session: ClassroomSession,
  studentId: string,
  checkpoints: readonly MissionCheckpoint[],
  now = Date.now(),
): ClassroomSession {
  const seat = session.seats.find((row) => row.studentId === studentId)
  if (seat === undefined) return session
  if (!allPointsReached(seat, checkpoints)) return session
  if (seat.approvedAt !== null) return session
  return updateSeatPhase(session, studentId, 'returning', { approvedAt: now })
}

/**
 * The Drone is down after an approved task, so the Mission is over for that seat.
 *
 * From Telemetry, never from a press, and only from `returning`: a Drone that touches down
 * mid-Mission has landed, not finished.
 */
export function markSeatComplete(
  session: ClassroomSession,
  studentId: string,
  now = Date.now(),
): ClassroomSession {
  const seat = session.seats.find((row) => row.studentId === studentId)
  if (seat === undefined || seat.phase !== 'returning') return session
  void now
  return updateSeatPhase(session, studentId, 'complete')
}

export function updateSeatPhase(
  session: ClassroomSession,
  studentId: string,
  phase: StudentMissionPhase,
  patch: Partial<ClassroomSeat> = {},
): ClassroomSession {
  return writeClassroomSession({
    ...session,
    seats: session.seats.map((row) =>
      row.studentId === studentId ? { ...row, ...patch, phase } : row,
    ),
  })
}

export function requestTakeoff(
  session: ClassroomSession,
  studentId: string,
  now = Date.now(),
): ClassroomSession {
  return updateSeatPhase(session, studentId, 'awaiting-clearance', {
    takeoffRequestedAt: now,
    heldAt: null,
  })
}

/** Teacher granted takeoff for this seat's craft (or this student). */
export function grantSeatClearance(
  session: ClassroomSession,
  studentId: string,
  now = Date.now(),
): ClassroomSession {
  return updateSeatPhase(session, studentId, 'cleared', {
    clearedAt: now,
    heldAt: null,
  })
}

export function holdSeatClearance(
  session: ClassroomSession,
  studentId: string,
  now = Date.now(),
): ClassroomSession {
  /*
   * Held is its own phase. Sending the seat back to `request-takeoff` made a held Student
   * indistinguishable from one who had never asked, so the screen could not tell them why
   * they were waiting. They may ask again; that is what clears it.
   */
  return updateSeatPhase(session, studentId, 'held', {
    heldAt: now,
    takeoffRequestedAt: null,
    clearedAt: null,
  })
}

/** When Teacher grants a craft clearance, clear matching Student seats. */
export function grantSeatsForDrone(
  session: ClassroomSession,
  droneId: DroneId,
  now = Date.now(),
): ClassroomSession {
  let next = session
  for (const seat of seatsForDrone(session, droneId)) {
    next = grantSeatClearance(next, seat.studentId, now)
  }
  return next
}

/**
 * When Teacher holds a craft's request, the Student's tablet says so.
 *
 * The other half of `holdClearance`. Without it the Teacher's answer never leaves the
 * Teacher's board, and a Student who asked sits on "Waiting for your Teacher" while the
 * Teacher believes they have told them to wait.
 *
 * Only a seat that has actually asked is held. Holding a Student who never asked would put
 * a screen in front of them answering a question they did not ask.
 */
export function holdSeatsForDrone(
  session: ClassroomSession,
  droneId: DroneId,
  now = Date.now(),
): ClassroomSession {
  let next = session
  for (const seat of seatsForDrone(session, droneId)) {
    if (seat.phase !== 'awaiting-clearance') continue
    next = holdSeatClearance(next, seat.studentId, now)
  }
  return next
}

/**
 * The seats on this craft, or everyone still waiting when nobody is paired to it.
 *
 * The fallback is what makes a classroom where the Teacher never recorded who is on which
 * craft still work: an answer addressed to a craft nobody is sitting on reaches whoever is
 * waiting for one.
 */
function seatsForDrone(
  session: ClassroomSession,
  droneId: DroneId,
): readonly ClassroomSeat[] {
  const matched = session.seats.filter((seat) => seat.droneId === droneId)
  if (matched.length > 0) return matched
  return session.seats.filter((seat) => seat.phase === 'awaiting-clearance')
}

export function pushClassroomInstruction(
  session: ClassroomSession,
  text: string,
  kind: ClassroomInstruction['kind'] = 'info',
  now = Date.now(),
): ClassroomSession {
  return writeClassroomSession({
    ...session,
    instructions: [
      ...session.instructions,
      { id: `ins-${now}`, at: now, text, kind },
    ].slice(-20),
  })
}

function broadcastClassroom(session: ClassroomSession): void {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return
  try {
    const channel = new BroadcastChannel(CLASSROOM_CHANNEL)
    channel.postMessage(session)
    channel.close()
  } catch {
    /* ignore */
  }
}

export function subscribeClassroom(
  onChange: (session: ClassroomSession | null) => void,
): () => void {
  if (typeof window === 'undefined') return () => {}

  const onStorage = (event: StorageEvent) => {
    if (event.key !== CLASSROOM_SESSION_KEY) return
    onChange(readClassroomSession())
  }
  window.addEventListener('storage', onStorage)

  let channel: BroadcastChannel | null = null
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(CLASSROOM_CHANNEL)
    channel.onmessage = (event: MessageEvent<ClassroomSession>) => {
      if (event.data && typeof event.data.code === 'string') {
        try {
          window.localStorage.setItem(CLASSROOM_SESSION_KEY, JSON.stringify(event.data))
        } catch {
          /* ignore */
        }
        onChange(event.data)
      }
    }
  }

  const poll = window.setInterval(() => {
    void pullClassroomFromCloud().then((remote) => {
      if (!remote) return
      const local = readClassroomSession()
      if (!local || remote.updatedAt > local.updatedAt) {
        try {
          window.localStorage.setItem(CLASSROOM_SESSION_KEY, JSON.stringify(remote))
        } catch {
          /* ignore */
        }
        onChange(remote)
      }
    })
  }, 2_500)

  return () => {
    window.removeEventListener('storage', onStorage)
    channel?.close()
    window.clearInterval(poll)
  }
}

export function classroomApiUrl(code: string): string {
  const normalized = normalizeClassroomCode(code)
  if (typeof window === 'undefined') return `/api/classroom?code=${normalized}`
  const fromEnv = process.env.NEXT_PUBLIC_CLASSROOM_SYNC_URL
  if (fromEnv && fromEnv.trim() !== '') {
    return `${fromEnv.trim().replace(/\/$/, '')}?code=${normalized}`
  }
  return `/api/classroom?code=${normalized}`
}

let pushTimer: ReturnType<typeof setTimeout> | null = null
let pendingPush: ClassroomSession | null = null

export function scheduleClassroomCloudPush(session: ClassroomSession): void {
  pendingPush = session
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    const snapshot = pendingPush
    pendingPush = null
    pushTimer = null
    if (snapshot) void pushClassroomToCloud(snapshot)
  }, 800)
}

export async function pushClassroomToCloud(
  session: ClassroomSession,
  fetchImpl: typeof fetch = fetch,
): Promise<'ok' | 'skipped' | 'error'> {
  try {
    const response = await fetchImpl(classroomApiUrl(session.code), {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(session),
    })
    if (response.status === 503 || response.status === 404) return 'skipped'
    return response.ok ? 'ok' : 'error'
  } catch {
    return 'skipped'
  }
}

export async function pullClassroomFromCloud(
  code?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ClassroomSession | null> {
  const local = readClassroomSession()
  const useCode = normalizeClassroomCode(code ?? local?.code ?? '')
  if (!useCode) return null
  try {
    const response = await fetchImpl(classroomApiUrl(useCode))
    if (!response.ok) return null
    const body = (await response.json()) as ClassroomSession
    if (!body || typeof body.code !== 'string') return null
    return body
  } catch {
    return null
  }
}

/** Load a classroom by code into this browser (Student join). */
export async function loadClassroomByCode(code: string): Promise<ClassroomSession | null> {
  const normalized = normalizeClassroomCode(code)
  if (!normalized) return null
  // Local first — same laptop / second tab never needs the cloud round trip.
  const local = readClassroomSession()
  if (local && local.code === normalized) return classroomHasEnded(local) ? null : local
  const remote = await pullClassroomFromCloud(normalized)
  /*
   * A code for a finished lesson is not a code. Refused here rather than at each caller, so
   * the door and the tablet cannot disagree about whether last week's four letters still open
   * the room.
   */
  if (remote && classroomHasEnded(remote)) return null
  if (remote) {
    try {
      window.localStorage.setItem(CLASSROOM_SESSION_KEY, JSON.stringify(remote))
    } catch {
      /* ignore */
    }
    return remote
  }
  return null
}

export function resetClassroomForTests(): void {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = null
  pendingPush = null
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(CLASSROOM_SESSION_KEY)
  window.localStorage.removeItem(STUDENT_SEAT_KEY)
}
