import type { DroneId, FleetEvent } from '@techtechflight/contract'
import { scheduleLogbookCloudPush } from './logbook-sync'
import {
  mergeRemedialQueue,
  remedialCandidatesFromLesson,
  type RemedialEntry,
} from './remedial-queue'

export type { RemedialEntry } from './remedial-queue'

/**
 * What the Teacher knows that no Drone can report.
 *
 * Telemetry says what an aircraft is doing. It cannot say "this one keeps faulting, stop
 * handing it out" or "Year 8, period 3" — those are a Teacher's own record, and there is
 * nowhere on the ground station to put them: the board is read-only by design and sends
 * nothing back over the socket.
 *
 * So the Logbook lives in this browser first. Dual-write (#93) may mirror a snapshot to
 * Vercel when a sync secret is set — local save still happens first so the classroom works
 * offline. Clearing site data clears the local copy; the cloud copy is last-write-wins.
 *
 * Trainer identity (Student / trainer Drone / prepared Lesson / LessonDrone /
 * LessonAssignment) lives here too — 3NF-shaped relations in the same browser store
 * (ADR-0005 / ADR-0015). Nothing about those rows rides the Telemetry socket.
 */

export type ServiceState = 'in-service' | 'watch' | 'out-of-service'

export const SERVICE_PRESENTATION: Readonly<
  Record<ServiceState, { label: string; meaning: string }>
> = {
  'in-service': {
    label: 'In service',
    meaning: 'Normal. Issue to a Student as normal.',
  },
  /*
   * The key is `watch` and must stay `watch`. It is serialized into the browser logbook, so
   * renaming it would silently invalidate every service decision a Teacher has stored, with
   * no migration and no error. Only the two strings below are copy.
   */
  watch: {
    label: 'Under observation',
    meaning: 'Serviceable. A recent fault history requires monitoring during the lesson.',
  },
  'out-of-service': {
    label: 'Out of service',
    meaning: 'Do not issue. Pending inspection.',
  },
}

export interface ServiceRecord {
  readonly state: ServiceState
  readonly reason: string
  readonly since: number
}

export interface DroneNote {
  readonly text: string
  readonly updatedAt: number
}

export interface LessonIncident {
  readonly at: number
  readonly text: string
  readonly severity: 'attention' | 'fault'
  /*
   * Which Drone it was, denormalised for the same reason a Fleet Event carries a name:
   * a record read next term has to stay readable after that Drone has been sent back.
   * Optional because records written before the board kept them are still worth showing.
   */
  readonly droneId?: DroneId
  readonly droneName?: string
}

/**
 * How often one Drone has misbehaved, counted rather than listed.
 *
 * The ground station remembers a bounded window and forgets the rest, so a Teacher asking
 * "which of these keeps failing" gets an answer that resets every time the process
 * restarts. Counts are cheap to keep and survive that; the events that produced them are
 * not and do not.
 */
export interface DroneTally {
  readonly faults: number
  readonly dropouts: number
  readonly flights: number
}

export const EMPTY_TALLY: DroneTally = { faults: 0, dropouts: 0, flights: 0 }

/**
 * One lesson, from pre-flight check to the summary afterwards.
 *
 * `readyAtStart` and `fleetSize` are captured rather than recomputed: the point of the
 * record is what was true when the lesson began, and a Fleet that has since been charged
 * would quietly rewrite history if this were derived later.
 */
export interface LessonRecord {
  readonly id: string
  readonly label: string
  readonly startedAt: number
  readonly endedAt: number | null
  readonly readyAtStart: number
  readonly fleetSize: number
  readonly incidents: readonly LessonIncident[]
  /**
   * Per-Drone counts for this lesson, written once as it closes. Absent on a lesson still
   * under way, and on records saved before the board kept them.
   */
  readonly tally?: Readonly<Record<DroneId, DroneTally>>
  /** The sequence this Lesson runs through. Absent on a Lesson started without a plan. */
  readonly exercises?: readonly Exercise[]
  /** Who was flying what when it began, captured rather than looked up later. */
  readonly assignments?: Readonly<Record<DroneId, string>>
  /** Every Command sent during it. */
  readonly commands?: readonly CommandRecord[]
  /** Moments the Teacher bookmarked while it was running. */
  readonly bookmarks?: readonly LessonBookmark[]
}

/** One task within a Lesson. What a Student is meant to be doing right now. */
export interface Exercise {
  readonly id: string
  readonly name: string
  /** Optional. An Exercise with no intended duration is normal, not incomplete. */
  readonly minutes?: number
}

/** A Command the Teacher sent during a Lesson, kept for the report afterwards (C7). */
export interface CommandRecord {
  readonly at: number
  readonly droneId: DroneId
  readonly droneName: string
  readonly kind: string
}

/** A moment the Teacher marked during a running lesson — timestamp plus optional note. */
export interface LessonBookmark {
  readonly at: number
  readonly note?: string
}

/**
 * A Student the Teacher has registered — identity plus the name said across the room.
 *
 * `studentId` is what Assignments join on. `name` is what strips and Alerts show (D5).
 * Napkin example IDs are illustration only; Teachers choose their own.
 */
export interface StudentRecord {
  readonly studentId: string
  readonly name: string
}

/**
 * Trainer inventory metadata for one airframe — not flight Telemetry.
 *
 * `droneId` aligns with the Fleet id when known. `model` and `createdDate` are what a
 * Teacher writes down about the craft between Lessons; they never ride the socket.
 */
export interface TrainerDroneRecord {
  readonly droneId: DroneId
  readonly model: string
  readonly createdDate: string
}

/** A prepared class / plan in the Trainer DB — distinct from a running LessonRecord. */
export interface TrainerLessonRecord {
  readonly lessonId: string
  readonly lessonName: string
}

/** Which craft are in a prepared Lesson (many-to-many; not a forever belongs-To). */
export interface LessonDroneRecord {
  readonly lessonId: string
  readonly droneId: DroneId
}

/** Who flies which craft in a prepared Lesson — keyed by studentId, not name. */
export interface LessonAssignmentRecord {
  readonly lessonId: string
  readonly droneId: DroneId
  readonly studentId: string
}

export interface Logbook {
  readonly notes: Readonly<Record<DroneId, DroneNote>>
  readonly service: Readonly<Record<DroneId, ServiceRecord>>
  readonly lessons: readonly LessonRecord[]
  /**
   * Which Student is flying which Drone, for this lesson.
   *
   * A Drone reports what it is doing; it has no idea whose hands are on the controller.
   * Without this the Flight Control Center can say "Drone 3 is too close to Drone 1" and
   * the Teacher still has to work out who to call across a noisy room.
   *
   * Values are `studentId` once the roster has been written; legacy name-only values still
   * load and `studentOf` resolves either shape to the name strips show.
   */
  readonly students: Readonly<Record<DroneId, string>>
  /**
   * The names in the class, kept between Lessons.
   *
   * Derived from `roster` on write. Legacy name-only rolls still load; the next write
   * migrates them into Student records with ids.
   */
  readonly roll: readonly string[]
  /** Registered Students — studentId + name. Empty until a write migrates a legacy roll. */
  readonly roster: readonly StudentRecord[]
  /** Trainer inventory rows — model and created date per Drone. */
  readonly trainerDrones: readonly TrainerDroneRecord[]
  /** Prepared Lessons in the Trainer DB (plans), not closed LessonRecords. */
  readonly trainerLessons: readonly TrainerLessonRecord[]
  readonly lessonDrones: readonly LessonDroneRecord[]
  readonly lessonAssignments: readonly LessonAssignmentRecord[]
  /** Students / Drones needing remedial follow-up after a lesson. */
  readonly remedialQueue?: readonly RemedialEntry[]
  /**
   * When this browser last revised the Logbook. Used for cloud last-write-wins (#93).
   * Absent on records written before dual-write.
   */
  readonly revisedAt?: number
}

/**
 * A Logbook as an older build wrote it.
 *
 * These were called pilots until the glossary was applied — CONTEXT.md lists the word
 * among those to avoid, and the person flying is a Student. A Teacher who exported their
 * records last term must get them back, so the old name is still read and never written.
 */
interface StoredLogbook extends Partial<Logbook> {
  readonly pilots?: Readonly<Record<DroneId, string>>
}

/** Whatever an older or newer build called it. */
export function studentsFrom(stored: StoredLogbook): Readonly<Record<DroneId, string>> {
  return stored.students ?? stored.pilots ?? {}
}

const EMPTY: Logbook = {
  notes: {},
  service: {},
  lessons: [],
  students: {},
  roll: [],
  roster: [],
  trainerDrones: [],
  trainerLessons: [],
  lessonDrones: [],
  lessonAssignments: [],
}

function rollFromRoster(roster: readonly StudentRecord[]): readonly string[] {
  return [...new Set(roster.map((student) => student.name))].sort((a, b) => a.localeCompare(b))
}

function slugForId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
}

/** Stable id for a legacy name so a migrate-on-write does not invent a new one every save. */
export function legacyStudentIdFor(name: string): string {
  const slug = slugForId(name)
  return slug === '' ? 'stu-unnamed' : `stu-${slug}`
}

/**
 * Next `S-0001` / `L-0001` style id that is not already taken.
 *
 * Teachers never type these — the board assigns them on create (#58). Legacy `stu-…`
 * and free-form ids from earlier Trainer UI stay valid and do not collide with the
 * serial counter (only exact `PREFIX-digits` rows advance the sequence).
 */
export function allocateSerialId(
  existing: readonly string[],
  prefix: 'S' | 'L',
): string {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`)
  let highest = 0
  for (const id of existing) {
    const match = pattern.exec(id)
    if (!match) continue
    highest = Math.max(highest, Number(match[1]))
  }
  return `${prefix}-${String(highest + 1).padStart(4, '0')}`
}

export function allocateStudentId(book: Logbook): string {
  return allocateSerialId(
    book.roster.map((student) => student.studentId),
    'S',
  )
}

export function allocateLessonId(book: Logbook): string {
  return allocateSerialId(
    book.trainerLessons.map((lesson) => lesson.lessonId),
    'L',
  )
}

/**
 * Promote a name-only roll into roster rows, and rewrite live assignments to studentIds.
 *
 * Called on write, not on load — a Teacher who never opens Settings still keeps their
 * name-only file readable forever (#48).
 */
export function migrateRosterForward(book: Logbook): Logbook {
  if (book.roster.length > 0) {
    const roll = rollFromRoster(book.roster)
    if (roll.length === book.roll.length && roll.every((name, i) => name === book.roll[i])) {
      return book
    }
    return { ...book, roll }
  }
  if (book.roll.length === 0 && Object.keys(book.students).length === 0) return book

  const names = new Set<string>([...book.roll, ...Object.values(book.students)])
  const roster: StudentRecord[] = [...names]
    .map((name) => name.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ studentId: legacyStudentIdFor(name), name }))

  const byName = new Map(roster.map((student) => [student.name, student.studentId]))
  const students: Record<DroneId, string> = {}
  for (const [droneId, value] of Object.entries(book.students)) {
    const trimmed = value.trim()
    if (trimmed === '') continue
    students[droneId] = byName.get(trimmed) ?? trimmed
  }

  return { ...book, roster, students, roll: rollFromRoster(roster) }
}

export function studentRecordOf(book: Logbook, studentId: string): StudentRecord | null {
  return book.roster.find((student) => student.studentId === studentId) ?? null
}

export function studentByName(book: Logbook, name: string): StudentRecord | null {
  const trimmed = name.trim()
  if (trimmed === '') return null
  return book.roster.find((student) => student.name === trimmed) ?? null
}

/** Resolve a live assignment value (studentId or legacy name) to the name strips show. */
export function displayNameForAssignment(book: Logbook, value: string): string {
  return studentRecordOf(book, value)?.name ?? value
}

export const LOGBOOK_KEY = 'techtechflight:logbook'

const listeners = new Set<() => void>()
let cache: Logbook = EMPTY
let cacheIsFresh = false

function notify(): void {
  cacheIsFresh = false
  for (const listener of listeners) listener()
}

export function subscribeLogbook(onChange: () => void): () => void {
  listeners.add(onChange)
  /*
   * A Teacher with the board open on two screens should not see two different records.
   * `storage` fires in the *other* tabs, which is exactly the ones holding a stale copy.
   */
  const onStorage = (event: StorageEvent) => {
    if (event.key === LOGBOOK_KEY) notify()
  }
  window.addEventListener('storage', onStorage)

  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onStorage)
  }
}

/**
 * Cached between notifications on purpose.
 *
 * `useSyncExternalStore` calls this on every render and compares by identity, so parsing
 * the JSON afresh each time would hand React a new object every render and spin forever.
 */
export function readLogbook(): Logbook {
  if (cacheIsFresh) return cache
  cache = load()
  cacheIsFresh = true
  return cache
}

/** The server has no Teacher's browser to read. An empty record hydrates cleanly. */
export function readServerLogbook(): Logbook {
  return EMPTY
}

function load(): Logbook {
  try {
    const raw = window.localStorage.getItem(LOGBOOK_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as StoredLogbook
    const roster = parsed.roster ?? []
    const roll = parsed.roll ?? (roster.length > 0 ? [...rollFromRoster(roster)] : [])
    return {
      notes: parsed.notes ?? {},
      service: parsed.service ?? {},
      lessons: parsed.lessons ?? [],
      // Absent on records written before the board tracked who was flying what, and
      // under the old name on records written before the glossary was applied.
      students: studentsFrom(parsed),
      roll,
      // Trainer DB tables — absent on every record written before #48. Left empty on
      // load; migrate forward on write rather than rewriting the Teacher's file quietly.
      roster,
      trainerDrones: parsed.trainerDrones ?? [],
      trainerLessons: parsed.trainerLessons ?? [],
      lessonDrones: parsed.lessonDrones ?? [],
      lessonAssignments: parsed.lessonAssignments ?? [],
      ...(typeof parsed.revisedAt === 'number' ? { revisedAt: parsed.revisedAt } : {}),
    }
  } catch {
    // A locked-down school browser can refuse storage, and a half-written record is
    // worth less than none. Either way the board works; only the Teacher's own notes
    // are missing, and they are told so in Settings.
    return EMPTY
  }
}

function save(next: Logbook): void {
  const stamped: Logbook = { ...next, revisedAt: Date.now() }
  cache = stamped
  cacheIsFresh = true
  try {
    window.localStorage.setItem(LOGBOOK_KEY, JSON.stringify(stamped))
  } catch {
    // Kept in memory for this session even when it cannot be persisted.
  }
  for (const listener of listeners) listener()
  // Dual-write: local already won; cloud push is best-effort and debounced (#93).
  scheduleLogbookCloudPush(stamped)
}

/** Replace the local Logbook from a cloud snapshot (hydrate). Does not re-push. */
export function replaceLogbookFromCloud(book: Logbook, revisedAt: number): void {
  const stamped: Logbook = { ...book, revisedAt }
  cache = stamped
  cacheIsFresh = true
  try {
    window.localStorage.setItem(LOGBOOK_KEY, JSON.stringify(stamped))
  } catch {
    /* memory only */
  }
  for (const listener of listeners) listener()
}

export function writeNote(droneId: DroneId, text: string, at: number): void {
  const book = readLogbook()
  const notes = { ...book.notes }
  if (text.trim() === '') delete notes[droneId]
  else notes[droneId] = { text: text.trim(), updatedAt: at }
  save({ ...book, notes })
}

export function setServiceState(
  droneId: DroneId,
  state: ServiceState,
  reason: string,
  at: number,
): void {
  const book = readLogbook()
  const service = { ...book.service }
  // In service is the resting state, so it is recorded as the absence of a record
  // rather than as a row saying nothing is wrong.
  if (state === 'in-service') delete service[droneId]
  else service[droneId] = { state, reason: reason.trim(), since: at }
  save({ ...book, service })
}

export function serviceStateOf(book: Logbook, droneId: DroneId): ServiceState {
  return book.service[droneId]?.state ?? 'in-service'
}

/** Hand a Drone to a Student, or take it back with an empty name. */
export function assignStudent(droneId: DroneId, name: string): void {
  let book = migrateRosterForward(readLogbook())
  const trimmed = name.trim()
  const students = { ...book.students }
  if (trimmed === '') {
    delete students[droneId]
    save({ ...book, students })
    return
  }

  let student = studentByName(book, trimmed) ?? studentRecordOf(book, trimmed)
  if (!student) {
    student = { studentId: legacyStudentIdFor(trimmed), name: trimmed }
    const roster = [...book.roster, student].sort((a, b) => a.name.localeCompare(b.name))
    book = { ...book, roster, roll: rollFromRoster(roster) }
  }
  students[droneId] = student.studentId
  save({ ...book, students, roll: rollFromRoster(book.roster) })
}

/** The name strips and Alerts show — never the studentId. */
export function studentOf(book: Logbook, droneId: DroneId): string | null {
  const value = book.students[droneId]
  if (value === undefined) return null
  return displayNameForAssignment(book, value)
}

/** The studentId on a live assignment, when the value has been migrated. */
export function studentIdOf(book: Logbook, droneId: DroneId): string | null {
  const value = book.students[droneId]
  if (value === undefined) return null
  if (studentRecordOf(book, value)) return value
  return studentByName(book, value)?.studentId ?? null
}

/** Everyone put down at the end of a lesson, so the next one starts clean. */
export function clearStudents(): void {
  save({ ...migrateRosterForward(readLogbook()), students: {} })
}

export function startLesson(
  label: string,
  readyAtStart: number,
  fleetSize: number,
  at: number,
  exercises: readonly Exercise[] = [],
): string {
  const book = migrateRosterForward(readLogbook())
  const id = `lesson-${at}`
  // Names captured, not studentIds — a report read next term must stay readable after
  // the roster has changed (G6).
  const assignments: Record<DroneId, string> = {}
  for (const droneId of Object.keys(book.students)) {
    const name = studentOf(book, droneId)
    if (name !== null) assignments[droneId] = name
  }
  const lesson: LessonRecord = {
    id,
    label: label.trim() || 'Untitled lesson',
    startedAt: at,
    endedAt: null,
    readyAtStart,
    fleetSize,
    incidents: [],
    exercises,
    // Captured as it begins. A Drone reassigned mid-lesson must not rewrite who was
    // flying it at the start, which is what the report is a record of.
    assignments,
    commands: [],
    bookmarks: [],
  }
  save({ ...book, lessons: [lesson, ...book.lessons].slice(0, 100) })
  return id
}

export function endLesson(
  id: string,
  at: number,
  tally: Readonly<Record<DroneId, DroneTally>>,
): void {
  const book = readLogbook()
  const closed = book.lessons.find((lesson) => lesson.id === id && lesson.endedAt === null)
  const lessons = book.lessons.map((lesson) =>
    lesson.id === id && lesson.endedAt === null ? { ...lesson, endedAt: at, tally } : lesson,
  )
  const remedialQueue =
    closed === undefined
      ? book.remedialQueue ?? []
      : mergeRemedialQueue(
          book.remedialQueue ?? [],
          remedialCandidatesFromLesson({ ...closed, endedAt: at, tally }, book),
        )
  save({ ...book, lessons, remedialQueue })
}

/** Flag a Drone for remedial follow-up — local Logbook only (ADR-0011). */
export function enqueueRemedial(entry: RemedialEntry): void {
  const book = readLogbook()
  save({
    ...book,
    remedialQueue: mergeRemedialQueue(book.remedialQueue ?? [], [entry]),
  })
}

/** Remove one Drone from the remedial queue once follow-up is done. */
export function dismissRemedial(droneId: DroneId): void {
  const book = readLogbook()
  save({
    ...book,
    remedialQueue: (book.remedialQueue ?? []).filter((entry) => entry.droneId !== droneId),
  })
}

export function remedialQueueOf(book: Logbook): readonly RemedialEntry[] {
  return book.remedialQueue ?? []
}

/** Reduce a run of Fleet Events to the counts worth keeping after the events age out. */
export function tallyEvents(events: readonly FleetEvent[]): Record<DroneId, DroneTally> {
  const tally: Record<DroneId, DroneTally> = {}
  for (const event of events) {
    const running = tally[event.droneId] ?? EMPTY_TALLY
    tally[event.droneId] = {
      faults: running.faults + (event.kind === 'fault-raised' ? 1 : 0),
      dropouts: running.dropouts + (event.kind === 'contact-lost' ? 1 : 0),
      flights: running.flights + (event.kind === 'took-off' ? 1 : 0),
    }
  }
  return tally
}

export interface TalliedWindow {
  readonly from: number
  readonly to: number
}

/**
 * The stretches of time already counted into a closed lesson's tally.
 *
 * The ground station's live history and the saved lessons overlap for as long as an event
 * stays in the retained window. A fault counted from both would make an airframe look
 * twice as bad as it is, which is exactly the number a Teacher would take to the supplier.
 */
export function talliedWindows(book: Logbook): readonly TalliedWindow[] {
  const windows: TalliedWindow[] = []
  for (const lesson of book.lessons) {
    if (lesson.endedAt === null || lesson.tally === undefined) continue
    windows.push({ from: lesson.startedAt, to: lesson.endedAt })
  }
  return windows
}

export function alreadyTallied(windows: readonly TalliedWindow[], at: number): boolean {
  return windows.some((window) => at >= window.from && at <= window.to)
}

/** Every closed lesson's tally, summed per Drone. */
export function persistedTally(book: Logbook): Readonly<Record<DroneId, DroneTally>> {
  const total: Record<DroneId, DroneTally> = {}
  for (const lesson of book.lessons) {
    if (lesson.tally === undefined) continue
    for (const droneId of Object.keys(lesson.tally)) {
      const lessonTally = lesson.tally[droneId] ?? EMPTY_TALLY
      const running = total[droneId] ?? EMPTY_TALLY
      total[droneId] = {
        faults: running.faults + lessonTally.faults,
        dropouts: running.dropouts + lessonTally.dropouts,
        flights: running.flights + lessonTally.flights,
      }
    }
  }
  return total
}

/** How many closed lessons the persisted counts are drawn from, for saying so on screen. */
export function talliedLessonCount(book: Logbook): number {
  return talliedWindows(book).length
}

export function addIncident(id: string, incident: LessonIncident): void {
  const book = readLogbook()
  save({
    ...book,
    lessons: book.lessons.map((lesson) =>
      lesson.id === id
        ? { ...lesson, incidents: [...lesson.incidents, incident].slice(-200) }
        : lesson,
    ),
  })
}

/**
 * Which Exercise a Lesson is on, and how far through the sequence it is.
 *
 * Advances on the durations the Teacher gave. An Exercise with no duration has no end, so
 * it becomes the current one and stays there — which is the honest answer rather than
 * guessing a length nobody stated, and means a plan written without times still reads as
 * a plan rather than as a countdown running out.
 */
export function currentExercise(
  lesson: LessonRecord,
  now: number,
): { readonly exercise: Exercise; readonly position: number; readonly of: number } | null {
  const exercises = lesson.exercises ?? []
  if (exercises.length === 0) return null

  let elapsed = Math.max(0, now - lesson.startedAt)
  for (const [index, exercise] of exercises.entries()) {
    if (exercise.minutes === undefined) {
      return { exercise, position: index + 1, of: exercises.length }
    }
    const length = exercise.minutes * 60_000
    if (elapsed < length) return { exercise, position: index + 1, of: exercises.length }
    elapsed -= length
  }

  // Past the end of the plan. The Lesson carries on; there is simply nothing it is
  // supposed to be doing, and saying so beats naming an Exercise that finished.
  return null
}

/** The lesson currently under way, if there is one. */
export function runningLesson(book: Logbook): LessonRecord | null {
  return book.lessons.find((lesson) => lesson.endedAt === null) ?? null
}

/** The class, kept so it is typed once rather than every period. */
export function saveRoll(names: readonly string[]): void {
  const book = migrateRosterForward(readLogbook())
  const wanted = [...new Set(names.map((name) => name.trim()).filter(Boolean))]
  const byName = new Map(book.roster.map((student) => [student.name, student]))
  const roster: StudentRecord[] = wanted
    .map((name) => byName.get(name) ?? { studentId: legacyStudentIdFor(name), name })
    .sort((a, b) => a.name.localeCompare(b.name))

  const keptIds = new Set(roster.map((student) => student.studentId))
  const students: Record<DroneId, string> = {}
  for (const [droneId, value] of Object.entries(book.students)) {
    if (keptIds.has(value)) {
      students[droneId] = value
      continue
    }
    const match = roster.find((student) => student.name === value.trim())
    if (match) students[droneId] = match.studentId
  }

  save({
    ...book,
    roster,
    students,
    roll: rollFromRoster(roster),
    lessonAssignments: book.lessonAssignments.filter((row) => keptIds.has(row.studentId)),
  })
}

/** Remember a name the Teacher has just used, so they never type it twice. */
export function rememberStudent(name: string): void {
  const trimmed = name.trim()
  if (trimmed === '') return
  const book = migrateRosterForward(readLogbook())
  if (studentByName(book, trimmed)) return
  saveRoll([...book.roll, trimmed])
}

/** Register or update a Student by id. studentId must be unique. */
export function upsertStudent(studentId: string, name: string): void {
  const id = studentId.trim()
  const trimmed = name.trim()
  if (id === '' || trimmed === '') return
  const book = migrateRosterForward(readLogbook())
  const without = book.roster.filter((student) => student.studentId !== id)
  const roster = [...without, { studentId: id, name: trimmed }].sort((a, b) =>
    a.name.localeCompare(b.name),
  )
  save({ ...book, roster, roll: rollFromRoster(roster) })
}

/**
 * Add a Student by name only — the board assigns `S-…`.
 *
 * Returns the studentId. A name already on the roster is left alone (same id), so Add is
 * safe to press twice.
 */
export function registerStudent(name: string): string | null {
  const trimmed = name.trim()
  if (trimmed === '') return null
  const book = migrateRosterForward(readLogbook())
  const existing = studentByName(book, trimmed)
  if (existing) return existing.studentId
  const studentId = allocateStudentId(book)
  upsertStudent(studentId, trimmed)
  return studentId
}

export function removeStudent(studentId: string): void {
  const book = migrateRosterForward(readLogbook())
  const roster = book.roster.filter((student) => student.studentId !== studentId)
  const students: Record<DroneId, string> = {}
  for (const [droneId, value] of Object.entries(book.students)) {
    if (value !== studentId) students[droneId] = value
  }
  save({
    ...book,
    roster,
    students,
    roll: rollFromRoster(roster),
    lessonAssignments: book.lessonAssignments.filter((row) => row.studentId !== studentId),
  })
}

export function upsertTrainerDrone(droneId: DroneId, model: string, createdDate: string): void {
  const book = migrateRosterForward(readLogbook())
  const row: TrainerDroneRecord = {
    droneId,
    model: model.trim(),
    createdDate: createdDate.trim(),
  }
  const trainerDrones = [
    ...book.trainerDrones.filter((drone) => drone.droneId !== droneId),
    row,
  ].sort((a, b) => a.droneId.localeCompare(b.droneId))
  save({ ...book, trainerDrones })
}

export function removeTrainerDrone(droneId: DroneId): void {
  const book = migrateRosterForward(readLogbook())
  save({
    ...book,
    trainerDrones: book.trainerDrones.filter((drone) => drone.droneId !== droneId),
    lessonDrones: book.lessonDrones.filter((row) => row.droneId !== droneId),
    lessonAssignments: book.lessonAssignments.filter((row) => row.droneId !== droneId),
  })
}

export function upsertTrainerLesson(lessonId: string, lessonName: string): void {
  const id = lessonId.trim()
  const name = lessonName.trim()
  if (id === '' || name === '') return
  const book = migrateRosterForward(readLogbook())
  const trainerLessons = [
    ...book.trainerLessons.filter((lesson) => lesson.lessonId !== id),
    { lessonId: id, lessonName: name },
  ].sort((a, b) => a.lessonName.localeCompare(b.lessonName))
  save({ ...book, trainerLessons })
}

/**
 * Create a prepared Lesson by name only — the board assigns `L-…`.
 *
 * Returns the lessonId, or null when the name is empty.
 */
export function createTrainerLesson(lessonName: string): string | null {
  const name = lessonName.trim()
  if (name === '') return null
  const book = migrateRosterForward(readLogbook())
  const lessonId = allocateLessonId(book)
  upsertTrainerLesson(lessonId, name)
  return lessonId
}

export function removeTrainerLesson(lessonId: string): void {
  const book = migrateRosterForward(readLogbook())
  save({
    ...book,
    trainerLessons: book.trainerLessons.filter((lesson) => lesson.lessonId !== lessonId),
    lessonDrones: book.lessonDrones.filter((row) => row.lessonId !== lessonId),
    lessonAssignments: book.lessonAssignments.filter((row) => row.lessonId !== lessonId),
  })
}

/** Attach a Drone to a prepared Lesson — membership only; not a permanent belongs-To. */
export function attachDroneToLesson(lessonId: string, droneId: DroneId): void {
  const book = migrateRosterForward(readLogbook())
  if (book.lessonDrones.some((row) => row.lessonId === lessonId && row.droneId === droneId)) {
    return
  }
  save({
    ...book,
    lessonDrones: [...book.lessonDrones, { lessonId, droneId }],
  })
}

export function detachDroneFromLesson(lessonId: string, droneId: DroneId): void {
  const book = migrateRosterForward(readLogbook())
  save({
    ...book,
    lessonDrones: book.lessonDrones.filter(
      (row) => !(row.lessonId === lessonId && row.droneId === droneId),
    ),
    lessonAssignments: book.lessonAssignments.filter(
      (row) => !(row.lessonId === lessonId && row.droneId === droneId),
    ),
  })
}

/**
 * Assign a Student to a Drone for one prepared Lesson.
 *
 * One Student cannot fly two Drones in the same Lesson; one Drone cannot have two Students.
 */
export function assignStudentToLessonDrone(
  lessonId: string,
  droneId: DroneId,
  studentId: string,
): void {
  const book = migrateRosterForward(readLogbook())
  if (!studentRecordOf(book, studentId)) return
  if (!book.lessonDrones.some((row) => row.lessonId === lessonId && row.droneId === droneId)) {
    // Membership first — Assignment without LessonDrone would be a dangling relation.
    return
  }
  const lessonAssignments = book.lessonAssignments.filter(
    (row) =>
      !(row.lessonId === lessonId && row.droneId === droneId) &&
      !(row.lessonId === lessonId && row.studentId === studentId),
  )
  save({
    ...book,
    lessonAssignments: [...lessonAssignments, { lessonId, droneId, studentId }],
  })
}

export function clearLessonDroneAssignment(lessonId: string, droneId: DroneId): void {
  const book = migrateRosterForward(readLogbook())
  save({
    ...book,
    lessonAssignments: book.lessonAssignments.filter(
      (row) => !(row.lessonId === lessonId && row.droneId === droneId),
    ),
  })
}

/**
 * Copy a prepared Lesson's Assignments onto the live board, so Control strips show names.
 *
 * Empty-assignment Lessons stay empty (E7 / D9) — applying nothing clears nothing.
 */
export function applyLessonAssignments(lessonId: string): void {
  const book = migrateRosterForward(readLogbook())
  const rows = book.lessonAssignments.filter((row) => row.lessonId === lessonId)
  if (rows.length === 0) return
  const students: Record<DroneId, string> = { ...book.students }
  for (const row of rows) {
    students[row.droneId] = row.studentId
  }
  save({ ...book, students })
}

/** Note a Command against the running Lesson, for the report afterwards (C7). */
export function recordCommand(lessonId: string, command: CommandRecord): void {
  const book = readLogbook()
  save({
    ...book,
    lessons: book.lessons.map((lesson) =>
      lesson.id === lessonId
        ? { ...lesson, commands: [...(lesson.commands ?? []), command].slice(-200) }
        : lesson,
    ),
  })
}

/** Bookmark a moment in a running lesson — local Logbook only (ADR-0011). */
export function addLessonBookmark(lessonId: string, at: number, note?: string): void {
  const trimmed = note?.trim()
  const bookmark: LessonBookmark = trimmed ? { at, note: trimmed } : { at }
  const book = readLogbook()
  save({
    ...book,
    lessons: book.lessons.map((lesson) =>
      lesson.id === lessonId && lesson.endedAt === null
        ? { ...lesson, bookmarks: [...(lesson.bookmarks ?? []), bookmark].slice(-50) }
        : lesson,
    ),
  })
}

export function clearLogbook(): void {
  save(EMPTY)
}
