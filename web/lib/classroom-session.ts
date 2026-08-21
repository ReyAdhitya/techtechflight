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
  /**
   * How many times this seat has been written, by anybody.
   *
   * The classroom document is one JSON blob that a board and several tablets all write, and
   * whole-document last-write-wins loses whichever change did not go last: a child tapped a
   * Drone, the board pushed its own copy of the seats a second later, and the tap was gone.
   * The tablet then pulled that copy back and bounced to the Drone picker, and the Teacher's
   * board never saw the child at all. One cause, both symptoms.
   *
   * So the merge happens a seat at a time, and this counts the writes rather than the clock:
   * two devices in one classroom do not share a clock, and a laptop three minutes fast would
   * otherwise win every argument it took part in. Higher wins; equal means the store's copy
   * wins, because the store is the one place every device's writes are put in an order.
   *
   * Absent on a session written before this existed, which reads as zero.
   */
  readonly rev?: number
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
    // Named as gone as well as dropped, or the seat comes back: a row this device removes is
    // still on every other copy of the document until they are told it went.
    removedSeatIds: reclaiming
      ? [...(session.removedSeatIds ?? []), held.studentId]
      : (session.removedSeatIds ?? []),
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
    /*
     * Named as freed, or the merge puts it straight back. Seats are unioned across two copies
     * of the document, so a row this device has dropped is a row the tablet's copy still has,
     * and the next poll would hand the Teacher back the seat they just cleared.
     */
    removedSeatIds: [...(session.removedSeatIds ?? []), held.studentId],
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
  /**
   * How many times the room itself has been written. The document's half of {@link
   * ClassroomSeat.rev}, and it decides everything that is not a seat: the Scenario, the rules,
   * the zones, the craft, the clock. The board writes all of those and a tablet writes none of
   * them, so this is nearly always the board's own count.
   */
  readonly rev?: number
  /**
   * Seats the Teacher has freed, by id.
   *
   * A merge that unions two lists of seats can only ever add, so without this a Teacher
   * pressing Free would watch the seat come straight back from a tablet's copy on the next
   * poll. Named rather than counted, because the tablet is allowed to rejoin: a child taking
   * their seat again takes its id off this list, which is what makes Free "the child is not
   * here" rather than "this child may never fly".
   */
  readonly removedSeatIds?: readonly string[]
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
    rev: 0,
    removedSeatIds: [],
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
/**
 * How often a heartbeat is allowed to reach the store.
 *
 * The beat itself stays at ten seconds, because a second tab on the same laptop should notice
 * a dead board quickly and that costs nothing. The cloud copy is a minute behind, which still
 * tells a tablet across the room within a minute and costs sixty times less. At ten seconds a
 * single board open all night spends a day's free allowance before breakfast.
 */
export const HEARTBEAT_CLOUD_EVERY_MS = 60_000

let lastBoardCloudBeat = 0
let lastSeatCloudBeat = 0

/** True at most once a minute, so a beat writes locally always and remotely rarely. */
function beatReachesCloud(last: number, now: number): boolean {
  return now - last >= HEARTBEAT_CLOUD_EVERY_MS
}

export function touchBoard(now = Date.now()): ClassroomSession | null {
  const session = readClassroomSession()
  if (session === null) return null
  /*
   * A board whose Lesson has ended stops claiming to be somewhere. The owner ruled this on
   * 2026-08-12: a beat that carries on after the period is over is a board saying it is there
   * when nobody is, and it is what kept writing all night.
   */
  if (!session.live) return null
  const cloud = beatReachesCloud(lastBoardCloudBeat, now)
  if (cloud) lastBoardCloudBeat = now
  return writeClassroomSession({ ...session, boardSeenAt: now }, { cloud })
}

/** This seat's tablet says it is still there. Same freshness rule as {@link touchBoard}. */
export function touchSeat(studentId: string, now = Date.now()): ClassroomSession | null {
  const session = readClassroomSession()
  if (session === null) return null
  if (!session.seats.some((seat) => seat.studentId === studentId)) return null
  const cloud = beatReachesCloud(lastSeatCloudBeat, now)
  if (cloud) lastSeatCloudBeat = now
  return writeClassroomSession(
    {
      ...session,
      seats: session.seats.map((seat) =>
        seat.studentId === studentId ? { ...seat, seenAt: now } : seat,
      ),
    },
    { cloud },
  )
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

/**
 * Whether the way out of a classroom belongs on a child's screen. **Silence is not flight.**
 *
 * Never take the screen away from a child holding a flying aircraft — that half has not
 * changed. What changed is what counts as flying: `airborne` is the last thing the board
 * *said*, and a tablet that heard it seventeen hours ago still believes it, so a child sat on
 * "Land and wait" with nothing to press, forever, in a room where the lesson had finished the
 * previous afternoon. A board that has not spoken for forty seconds is not telling this tablet
 * anything, including that the Drone is up.
 *
 * A predicate rather than an expression inside the screen, because the pinned demonstration
 * the jsdom suite flies never leaves the ground: the airborne half of this rule is unreachable
 * there whatever the session says, and a rule nothing can test is a rule that quietly rots.
 */
export function mayLeaveClassroom(input: {
  readonly airborne: boolean
  readonly boardQuiet: boolean
}): boolean {
  return !input.airborne || input.boardQuiet
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
    rev: session.rev ?? 0,
    removedSeatIds: session.removedSeatIds ?? [],
    seats: (session.seats ?? []).map((seat) => ({
      ...seat,
      reachedCheckpointIds: seat.reachedCheckpointIds ?? [],
      approvedAt: seat.approvedAt ?? null,
      seenAt: seat.seenAt ?? null,
      rev: seat.rev ?? 0,
    })),
  }
}

/**
 * Stamp a write with what changed in it, so a merge can tell two copies apart.
 *
 * The clock is not usable for this. A classroom is a board and several tablets, none of which
 * share a clock, and the document is written by all of them: the last-write-wins the store
 * does on `updatedAt` therefore hands the argument to whichever device is set fastest, not to
 * whoever knew most. Counting writes instead is exact, and it is per seat, so a board saving
 * the Scenario cannot undo a child taking a Drone in the same second.
 *
 * `seenAt` is deliberately not a change. It is the heartbeat, it fires every ten seconds on
 * both sides, and a beat that bumped the count would make the count meaningless within a
 * minute. It merges as the later of the two instead.
 *
 * `updatedAt` climbs past whatever this device has already seen rather than simply reading
 * the clock, because a tablet a minute slow than the board would otherwise write a document
 * the store answers 409 to, forever, and the child would never appear on the board.
 */
function stampRevisions(
  prior: ClassroomSession | null,
  session: ClassroomSession,
  now = Date.now(),
): ClassroomSession {
  const priorSeat = (studentId: string) =>
    prior?.seats.find((row) => row.studentId === studentId) ?? null
  const highestRoom = Math.max(session.rev ?? 0, prior?.rev ?? 0)
  const roomChanged = prior === null || roomContent(prior) !== roomContent(session)

  /*
   * A seat this write has never heard of is kept, not dropped.
   *
   * Every writer starts from the session it was handed, and a Teacher's screen can be holding
   * one from before the child at the back joined: saving a Scenario would then delete them.
   * Only a seat the write names as freed goes, which is what makes Free the one way a row
   * leaves the board. Not across a code, because a new classroom starts with nobody in it.
   */
  const freed = new Set(session.removedSeatIds ?? [])
  const carriedOver =
    prior === null || prior.code !== session.code
      ? []
      : prior.seats.filter(
          (seat) =>
            !freed.has(seat.studentId) &&
            !session.seats.some((row) => row.studentId === seat.studentId),
        )

  return {
    ...session,
    updatedAt: Math.max(now, (session.updatedAt ?? 0) + 1, (prior?.updatedAt ?? 0) + 1),
    rev: roomChanged ? highestRoom + 1 : highestRoom,
    seats: [...session.seats, ...carriedOver]
      .map((seat) => {
        const before = priorSeat(seat.studentId)
        const highest = Math.max(seat.rev ?? 0, before?.rev ?? 0)
        const changed = before === null || seatContent(before) !== seatContent(seat)
        return { ...seat, rev: changed ? highest + 1 : highest }
      })
      .sort((a, b) => a.joinedAt - b.joinedAt),
  }
}

/** Everything about a seat except how many times it has been written and when it last beat. */
function seatContent(seat: ClassroomSeat): string {
  const { rev: _rev, seenAt: _seenAt, ...rest } = seat
  return JSON.stringify(rest)
}

/**
 * The room without the people in it, and without either heartbeat.
 *
 * A beat is not a change to the room. Both sides beat every ten seconds all lesson, so a
 * count that rose with them would say the room had been rewritten three hundred times by
 * break, and every poll would push a document nobody had edited back to the store. That is
 * the write rate that emptied the last store's allowance in ninety minutes.
 */
function roomContent(session: ClassroomSession): string {
  const {
    seats: _seats,
    updatedAt: _updatedAt,
    rev: _rev,
    boardSeenAt: _boardSeenAt,
    ...rest
  } = session
  return JSON.stringify(rest)
}

/**
 * Two copies of one classroom, reconciled into the copy that knows most.
 *
 * Neither side is right about everything, which is why this exists. The board owns the room:
 * the Scenario, the rules, the zones, the craft, whether the Lesson is over. A tablet owns its
 * own seat, and learns about everybody else's from whatever it last pulled. Before this, both
 * pushed the whole document and the later push simply erased the earlier one's half.
 *
 * Seats are unioned and settled one at a time by {@link ClassroomSeat.rev}, so a Teacher
 * granting a takeoff and a child taking a Drone in the same second both survive. The room
 * itself goes with the higher document `rev`. Equal counts hand it to `theirs`, which on every
 * caller is the store's copy: the store is where writes are put in an order, so agreeing to
 * take its answer is what makes two devices converge instead of pushing at each other.
 */
export function mergeClassroomSessions(
  mine: ClassroomSession | null,
  theirs: ClassroomSession | null,
): ClassroomSession | null {
  if (mine === null) return theirs
  if (theirs === null) return mine
  // Two different rooms do not merge. A tablet that has moved on holds the room it moved to.
  if (mine.code !== theirs.code) return mine

  const roomIsMine = (mine.rev ?? 0) > (theirs.rev ?? 0)
  const room = roomIsMine ? mine : theirs
  const freed = new Set([...(mine.removedSeatIds ?? []), ...(theirs.removedSeatIds ?? [])])

  const seats: ClassroomSeat[] = []
  const ids = new Set([
    ...mine.seats.map((seat) => seat.studentId),
    ...theirs.seats.map((seat) => seat.studentId),
  ])
  for (const studentId of ids) {
    if (freed.has(studentId)) continue
    const ours = mine.seats.find((seat) => seat.studentId === studentId) ?? null
    const theirSeat = theirs.seats.find((seat) => seat.studentId === studentId) ?? null
    if (ours === null) {
      seats.push(theirSeat!)
      continue
    }
    if (theirSeat === null) {
      seats.push(ours)
      continue
    }
    const winner = (ours.rev ?? 0) > (theirSeat.rev ?? 0) ? ours : theirSeat
    seats.push({ ...winner, seenAt: laterOf(ours.seenAt, theirSeat.seenAt) })
  }

  return {
    ...room,
    seats: seats.sort((a, b) => a.joinedAt - b.joinedAt),
    removedSeatIds: [...freed],
    // The room's own count, kept above both, so the merged copy reads as the newer one.
    rev: Math.max(mine.rev ?? 0, theirs.rev ?? 0),
    updatedAt: Math.max(mine.updatedAt, theirs.updatedAt),
    /*
     * The board's beat is the later of the two, whichever copy of the room won. It is how a
     * tablet knows the board is still there, and losing it with the room would make a board
     * that is plainly alive read as quiet on the screen beside it.
     */
    boardSeenAt: laterOf(mine.boardSeenAt, theirs.boardSeenAt),
  }
}

/** The later of two heartbeats, either of which may never have happened. */
function laterOf(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null) return b ?? null
  if (b == null) return a
  return Math.max(a, b)
}

/**
 * Whether one copy holds a write the other has not seen.
 *
 * By the counts rather than by the contents, because that is what the counts are for: two
 * copies at the same revision everywhere are the same document, whatever order their keys
 * came out of the store in.
 */
export function classroomsDiffer(a: ClassroomSession | null, b: ClassroomSession | null): boolean {
  if (a === null || b === null) return a !== b
  if ((a.rev ?? 0) !== (b.rev ?? 0)) return true
  /*
   * The heartbeats count here and nowhere else. They are the whole of how each side knows the
   * other has not gone quiet, so a poll that learned a newer beat and did not save it would
   * leave a board that is plainly there reading as silent on a tablet across the room. They
   * are still not worth a write to the store, which is what the seats-only question is for.
   */
  if ((a.boardSeenAt ?? 0) !== (b.boardSeenAt ?? 0)) return true
  const beatsDiffer = a.seats.some((seat) => {
    const other = b.seats.find((row) => row.studentId === seat.studentId)
    return other !== undefined && (seat.seenAt ?? 0) !== (other.seenAt ?? 0)
  })
  return beatsDiffer || classroomSeatsDiffer(a, b)
}

/**
 * The same question about the people only.
 *
 * What decides whether a merge is worth sending back to the store. The room is not asked
 * about, because the board pushes its own room changes when it makes them and a poll that
 * pushed on the room as well would send a document back every two and a half seconds for as
 * long as a Teacher had the board open.
 */
export function classroomSeatsDiffer(a: ClassroomSession, b: ClassroomSession): boolean {
  if (a.seats.length !== b.seats.length) return true
  if ((a.removedSeatIds ?? []).length !== (b.removedSeatIds ?? []).length) return true
  return a.seats.some((seat) => {
    const other = b.seats.find((row) => row.studentId === seat.studentId)
    return other === undefined || (seat.rev ?? 0) !== (other.rev ?? 0)
  })
}

export function writeClassroomSession(
  session: ClassroomSession,
  /**
   * `cloud: false` writes to this device only. Used by the heartbeats, which need to be
   * frequent locally and must not be frequent remotely.
   */
  options: { readonly cloud?: boolean } = {},
): ClassroomSession {
  if (typeof window === 'undefined') return session
  const next = stampRevisions(readClassroomSession(), session)
  try {
    window.localStorage.setItem(CLASSROOM_SESSION_KEY, JSON.stringify(next))
    broadcastClassroom(next)
    /* Somebody pressed something. Every poll on this device looks now rather than waiting. */
    wakeClassroomPolls()
  } catch {
    /* ignore */
  }
  /*
   * ONE cloud write, not two.
   *
   * This used to push immediately AND schedule a debounced push, so every local write cost
   * two remote ones. With a ten second heartbeat that is 720 writes an hour, and on
   * 2026-08-12 it exhausted a day's allowance in about ninety minutes: the store began
   * answering `KV put() limit exceeded for the day`, reads kept working, and the board could
   * no longer save the classroom. A Teacher saw "Could not reach the classroom cloud" while
   * the page itself loaded perfectly.
   *
   * `openClassroom` pushes immediately itself, which is the case the old immediate push
   * existed for: an iPad joining a second after the Teacher opened the room.
   */
  if (options.cloud !== false) scheduleClassroomCloudPush(next)
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
   *
   * **A classroom that has ended never carries on, whatever its Lesson id says.** Comparing
   * the ids alone was right for a Logbook Lesson and wrong for every run without one: a board
   * with no Lesson started carries `lessonId: null`, `null === null` is true, and so the run
   * after a Lesson ended inherited the finished one's code. Every device then read a classroom
   * stamped `endedAt`, which the tablets correctly refuse, and the Teacher read out four
   * letters that could not work. `endedAt` is the one fact both cases share: closing a Lesson
   * is the Teacher saying this room is over, and a room that is over cannot be walked back
   * into under the same code.
   */
  const carriesOn =
    existing !== null &&
    (existing.endedAt ?? null) === null &&
    existing.lessonId === input.lessonId
  const code = normalizeClassroomCode(
    input.code ?? (carriesOn ? existing.code : mintClassroomCode(now)),
  )
  const base = carriesOn && existing.code === code ? existing : emptySession(code, now)
  /*
   * Opening a room is the one write that cannot wait for the debounce: a Teacher reads the
   * code out and an iPad types it seconds later. Every other write is debounced, because
   * pushing on every change is what exhausted a day's store allowance in ninety minutes.
   */
  const opened = writeClassroomSession({
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
  rememberBoardClassroom(opened.code)
  void pushClassroomToCloud(opened)
  return opened
}

/**
 * Which classroom the board on **this device** opened, if any.
 *
 * One laptop can hold a Teacher board and a Student tablet at once, on purpose: the address
 * decides the role for a tab, so `/mission` and `/student` sit side by side. They share one
 * `localStorage`, and therefore one classroom, which is the point of it.
 *
 * What they must not share is the power to throw it away. A child pressing Leave on the second
 * tab removed the whole document, and the board, finding nothing there, minted a **new code**:
 * the four letters the Teacher had read out to thirty children stopped working, from a button
 * two tabs away. So the board says which room is its own here, and a tablet on the same device
 * forgets its seat rather than the room.
 */
const CLASSROOM_BOARD_KEY = 'techtechflight:classroom-board'

function rememberBoardClassroom(code: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CLASSROOM_BOARD_KEY, code)
  } catch {
    /* ignore */
  }
}

/** Whether the board on this device is the one that opened the classroom in front of us. */
export function boardOwnsClassroom(session: ClassroomSession | null = readClassroomSession()) {
  if (typeof window === 'undefined' || session === null) return false
  try {
    return window.localStorage.getItem(CLASSROOM_BOARD_KEY) === session.code
  } catch {
    return false
  }
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
    // Not the Teacher's own room, on the Teacher's own laptop. See `boardOwnsClassroom`.
    if (!boardOwnsClassroom()) window.localStorage.removeItem(CLASSROOM_SESSION_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * This tablet moves to a different classroom, and **keeps whose tablet it is**.
 *
 * Leaving and changing rooms are two different intentions and only one of them was on offer.
 * The only route to the code screen was Leave, which forgets the name as well as the room and
 * reads as final, so a Teacher who wanted the other classroom landed back on *What is your
 * name?* with no way forward but to type it again. Same tablet, same child, same morning.
 *
 * The session copy goes, because that is the room. The seat stays, because that is the child,
 * and the tablet re-seats itself under the same name the moment the new code lands.
 */
export function changeClassroom(): void {
  if (typeof window === 'undefined') return
  try {
    // Same rule as leaving: a tablet moves rooms, it does not close the Teacher's.
    if (!boardOwnsClassroom()) window.localStorage.removeItem(CLASSROOM_SESSION_KEY)
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
    const next = writeClassroomSession({
      ...session,
      seats,
      removedSeatIds: (session.removedSeatIds ?? []).filter((id) => id !== seat.studentId),
    })
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
  const next = writeClassroomSession({
    ...session,
    seats: [...session.seats, seat],
    /*
     * A child the Teacher freed may come back. Free means "this child is not here", and the
     * tablet answering for itself is the best evidence there is that they are, so taking the
     * seat again takes its id off the freed list rather than being quietly dropped by the
     * merge on the next poll.
     */
    removedSeatIds: (session.removedSeatIds ?? []).filter((id) => id !== seat.studentId),
  })
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

/**
 * Subscribers waiting to be told to look now.
 *
 * A backoff is right for a quiet room and wrong the instant somebody presses something: a
 * child asking to take off must not wait out twenty seconds of silence before their tablet
 * checks for the answer. Every write wakes every poll on this device.
 */
const classroomPollWakers = new Set<() => void>()

function wakeClassroomPolls(): void {
  for (const wake of classroomPollWakers) wake()
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

  /*
   * The store's copy is merged in, not swapped in.
   *
   * This used to take the remote document whole whenever its `updatedAt` was the later of the
   * two, and drop everything this device had written since. On the tablet that was the glitch:
   * a child tapped Drone 3, the seat was written, the next poll pulled the board's copy of the
   * seats a heartbeat later, and the screen bounced back to the Drone picker. On the board it
   * was the other face of it, a Student who joined as "kntl" leaving the board still reading
   * "Nobody is waiting", because the board's own frequent writes meant a tablet's document was
   * hardly ever the later one.
   *
   * A merge that learned something the store does not hold is pushed straight back, which is
   * what carries a seat the last few metres to the Teacher's board.
   */
  /*
   * **The poll backs off, and it does not run before there is a Mission.**
   *
   * Every device asking every 2.5 seconds is what emptied a Cloudflare allowance account-wide
   * in a day: thirty iPads is 43,200 requests an hour, and almost all of them learn nothing.
   * The board's own store now sits on the laptop, where a request costs nothing but the
   * asking — but a laptop serving thirty tablets is still a laptop, and the hosted copies are
   * still behind a cap.
   *
   * Two rules, and the second matters more than the first:
   *
   *  - **Nothing to watch, nothing to ask.** Before a classroom exists there is no document to
   *    poll for; a tablet sitting on the join door all morning asked anyway.
   *  - **Quiet rooms are asked about less often.** Every pull that changes nothing lengthens
   *    the wait, up to twenty seconds; anything that does change snaps it straight back to
   *    2.5 s, so the moment a Teacher grants a takeoff the room is lively again.
   *
   * The ceiling is deliberately short of a minute. A tablet is how a child learns their
   * takeoff was granted, and a Teacher watching a child wait is not interested in an
   * allowance.
   */
  const QUICK_MS = 2_500
  const SLOWEST_MS = 20_000
  let waitMs = QUICK_MS
  let timer: ReturnType<typeof setTimeout> | null = null
  let stopped = false

  const tick = async () => {
    if (stopped) return
    /* No classroom on this device yet: nothing to ask about, so do not ask. */
    const before = readClassroomSession()
    if (before === null) {
      waitMs = Math.min(SLOWEST_MS, waitMs * 2)
      schedule()
      return
    }

    let learnedSomething = false
    try {
      const remote = await pullClassroomFromCloud()
      if (remote) {
        const local = readClassroomSession()
        const merged = mergeClassroomSessions(local, remote)
        if (merged !== null) {
          if (classroomsDiffer(merged, local)) {
            learnedSomething = true
            try {
              window.localStorage.setItem(CLASSROOM_SESSION_KEY, JSON.stringify(merged))
            } catch {
              /* ignore */
            }
            onChange(merged)
          }
          if (classroomSeatsDiffer(merged, remote)) {
            learnedSomething = true
            scheduleClassroomCloudPush(merged)
          }
        }
      }
    } catch {
      /* A store that is not answering is not a reason to stop asking, only to ask slower. */
    }

    waitMs = learnedSomething ? QUICK_MS : Math.min(SLOWEST_MS, Math.round(waitMs * 1.6))
    schedule()
  }

  function schedule(): void {
    if (stopped) return
    timer = setTimeout(() => void tick(), waitMs)
  }

  schedule()

  /** Ask now, and go back to asking often. For a press that must not wait out a backoff. */
  classroomPollWakers.add(() => {
    waitMs = QUICK_MS
    if (timer) clearTimeout(timer)
    void tick()
  })

  return () => {
    stopped = true
    if (timer) clearTimeout(timer)
    window.removeEventListener('storage', onStorage)
    channel?.close()
  }
}

/**
 * Where the classroom store lives, and it is not `/api/classroom` any more.
 *
 * That route is a Vercel function over Vercel Blob, and on 2026-08-12 every Blob store on the
 * account read `Suspended`, `Billing State: Inactive`. It had been returning 500 for three
 * days and no second device could join a lesson. The owner will not add a payment method.
 *
 * So the default is now the Cloudflare Worker, a **built-in** rather than an environment
 * variable, because a build seed only reaches the deploy that was built with it: the laptop
 * launcher, `npm run dev` and anyone else's checkout all fell back to `/api/classroom` and
 * failed with "Could not reach the classroom cloud" no matter what the deployment was
 * configured with. A store every build can find is the point.
 *
 * Order: an explicit override, then the built-in, then the old Vercel route for anyone who
 * restores billing and wants it back.
 */
const CLASSROOM_STORE_URL = 'https://techtechflight-classroom.classroom-worker.workers.dev'

/** Set to `local` to use `/api/classroom` again, or to a URL to point somewhere else. */
export const CLASSROOM_SYNC_URL_KEY = 'techtechflight:classroom-sync-url'

/**
 * Whether this board was served by a ground station rather than by a hosted copy.
 *
 * The ground station serves the board on `:4321` and holds `/api/classroom` on the same
 * origin, so a board that arrived from it should talk to it: one hop across a travel router,
 * no account, no request cap, and it keeps working with the network cable out. A hosted copy
 * on Cloudflare or Vercel has no such endpoint and keeps the built-in store.
 *
 * Decided by the port rather than by a build seed, because a build seed only reaches the
 * deploy built with it and the laptop launcher serves the same artefact the hosted copies do.
 */
function servedByGroundStation(): boolean {
  try {
    return window.location.port === '4321'
  } catch {
    return false
  }
}

export function classroomApiUrl(code: string): string {
  const normalized = normalizeClassroomCode(code)
  if (typeof window === 'undefined') return `${CLASSROOM_STORE_URL}?code=${normalized}`

  /*
   * A Teacher-set override, the way `logbookSyncUrl` already has one. Without it a school
   * that runs its own store had to rebuild the app to point at it.
   */
  try {
    const saved = window.localStorage.getItem(CLASSROOM_SYNC_URL_KEY)
    if (saved && saved.trim() === 'local') return `/api/classroom?code=${normalized}`
    if (saved && /^https?:\/\//i.test(saved.trim())) {
      return `${saved.trim().replace(/\/$/, '')}?code=${normalized}`
    }
  } catch {
    /* ignore */
  }

  const fromEnv = process.env.NEXT_PUBLIC_CLASSROOM_SYNC_URL
  if (fromEnv && fromEnv.trim() !== '') {
    return `${fromEnv.trim().replace(/\/$/, '')}?code=${normalized}`
  }
  /* A board the ground station served talks to the ground station. */
  if (servedByGroundStation()) return `/api/classroom?code=${normalized}`
  return `${CLASSROOM_STORE_URL}?code=${normalized}`
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

/**
 * Send this device's copy to the store, and reconcile if the store says it is behind.
 *
 * The store answers 409 to a document whose `updatedAt` is older than the one it holds, and
 * that answer used to be the end of it: a tablet whose clock ran a minute behind the board's
 * could never write at all, so a child could join, take a Drone, ask to take off, and appear
 * on nobody's screen but their own. Nothing said so. Both sides looked like they were working.
 *
 * A 409 is not a failure, it is news: somebody wrote while this write was in flight. Pull what
 * they wrote, merge it under the same rules the poll uses, and send the result once. Once and
 * not in a loop, because the next poll is two and a half seconds away and a retry storm on a
 * classroom store is how the last allowance went.
 */
/**
 * What happened when this device last tried to reach the store, and **which store**.
 *
 * `'unconfigured'` means nobody set one up. `'refused'` means one answered and said no, and it
 * carries the status and the words. They were one state for three days while three Blob stores
 * sat suspended for unpaid billing, and a Teacher reading "not configured" cannot act on a
 * store that is refusing them.
 */
export interface ClassroomSyncReport {
  readonly state: 'ok' | 'unconfigured' | 'refused' | 'offline'
  /** Where the board was talking to, in words a Teacher can repeat down a phone. */
  readonly store: string
  readonly status: number | null
  readonly detail: string
}

/** The store this board is talking to, named for a human rather than as a URL. */
export function classroomStoreName(): string {
  const url = classroomApiUrl('ABCD')
  if (url.startsWith('/api/')) return 'this laptop'
  if (url.includes('workers.dev')) return 'the Cloudflare classroom store'
  try {
    return new URL(url).host
  } catch {
    return 'the classroom store'
  }
}

async function saidBy(response: Response): Promise<string> {
  try {
    const text = (await response.text()).slice(0, 300)
    if (text.trim() === '') return ''
    try {
      const parsed = JSON.parse(text) as { error?: unknown }
      return typeof parsed.error === 'string' ? parsed.error : text
    } catch {
      return text
    }
  } catch {
    return ''
  }
}

export async function reportClassroomSync(
  session: ClassroomSession,
  fetchImpl: typeof fetch = fetch,
): Promise<ClassroomSyncReport> {
  const store = classroomStoreName()
  try {
    const response = await fetchImpl(classroomApiUrl(session.code), {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(session),
    })
    if (response.ok) return { state: 'ok', store, status: response.status, detail: '' }
    const detail = await saidBy(response)
    /*
     * 503 is the only status meaning "nobody set this up". Everything else is a store that
     * answered and refused, and the 500 the Blob stores returned for three days belongs firmly
     * in the second group however much it looked like the first.
     */
    if (response.status === 503) return { state: 'unconfigured', store, status: 503, detail }
    return { state: 'refused', store, status: response.status, detail }
  } catch (error) {
    /* Nothing answered at all: a pulled cable, a router reboot, a laptop asleep. */
    return {
      state: 'offline',
      store,
      status: null,
      detail: error instanceof Error ? error.message : '',
    }
  }
}

export async function pushClassroomToCloud(
  session: ClassroomSession,
  fetchImpl: typeof fetch = fetch,
  retry = true,
): Promise<'ok' | 'skipped' | 'error'> {
  try {
    const response = await fetchImpl(classroomApiUrl(session.code), {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(session),
    })
    if (response.status === 503 || response.status === 404) return 'skipped'
    if (response.status === 409 && retry) {
      const remote = await pullClassroomFromCloud(session.code, fetchImpl)
      const merged = mergeClassroomSessions(session, remote)
      if (merged === null) return 'error'
      const ahead = {
        ...merged,
        updatedAt: Math.max(merged.updatedAt, remote?.updatedAt ?? 0) + 1,
      }
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(CLASSROOM_SESSION_KEY, JSON.stringify(ahead))
          broadcastClassroom(ahead)
        } catch {
          /* ignore */
        }
      }
      return pushClassroomToCloud(ahead, fetchImpl, false)
    }
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
    // Through the same defaults a local read gets: a room opened before revisions existed is
    // the ordinary case for a day or two, and a merge cannot compare counts that are absent.
    return withSeatDefaults(body)
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
  window.localStorage.removeItem(CLASSROOM_BOARD_KEY)
  lastBoardCloudBeat = 0
  lastSeatCloudBeat = 0
}
