import type { DroneId } from '@techtechflight/contract'

/**
 * What the Teacher knows that no Drone can report.
 *
 * Telemetry says what an aircraft is doing. It cannot say "this one keeps faulting, stop
 * handing it out" or "Year 8, period 3" — those are a Teacher's own record, and there is
 * nowhere on the ground station to put them: the board is read-only by design and sends
 * nothing back over the socket.
 *
 * So the Logbook lives in this browser. That is a real limitation and worth being plain
 * about — it does not follow a Teacher to another laptop, and clearing site data clears
 * it. It is also the only option that keeps the board read-only, works in a school with
 * no internet, and needs no account. Everything in here is exportable from Settings so
 * it is never trapped.
 */

export type ServiceState = 'in-service' | 'watch' | 'out-of-service'

export const SERVICE_PRESENTATION: Readonly<
  Record<ServiceState, { label: string; meaning: string }>
> = {
  'in-service': {
    label: 'In service',
    meaning: 'Normal. Hand it to a Student like any other.',
  },
  watch: {
    label: 'Keep an eye on it',
    meaning: 'Usable, but it has been misbehaving. Worth watching this lesson.',
  },
  'out-of-service': {
    label: 'Out of service',
    meaning: 'Do not hand this one out. It is waiting to be looked at.',
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
}

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
}

export interface Logbook {
  readonly notes: Readonly<Record<DroneId, DroneNote>>
  readonly service: Readonly<Record<DroneId, ServiceRecord>>
  readonly lessons: readonly LessonRecord[]
}

const EMPTY: Logbook = { notes: {}, service: {}, lessons: [] }

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
    const parsed = JSON.parse(raw) as Partial<Logbook>
    return {
      notes: parsed.notes ?? {},
      service: parsed.service ?? {},
      lessons: parsed.lessons ?? [],
    }
  } catch {
    // A locked-down school browser can refuse storage, and a half-written record is
    // worth less than none. Either way the board works; only the Teacher's own notes
    // are missing, and they are told so in Settings.
    return EMPTY
  }
}

function save(next: Logbook): void {
  cache = next
  cacheIsFresh = true
  try {
    window.localStorage.setItem(LOGBOOK_KEY, JSON.stringify(next))
  } catch {
    // Kept in memory for this session even when it cannot be persisted.
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

export function startLesson(label: string, readyAtStart: number, fleetSize: number, at: number): string {
  const book = readLogbook()
  const id = `lesson-${at}`
  const lesson: LessonRecord = {
    id,
    label: label.trim() || 'Untitled lesson',
    startedAt: at,
    endedAt: null,
    readyAtStart,
    fleetSize,
    incidents: [],
  }
  save({ ...book, lessons: [lesson, ...book.lessons].slice(0, 100) })
  return id
}

export function endLesson(id: string, at: number): void {
  const book = readLogbook()
  save({
    ...book,
    lessons: book.lessons.map((lesson) =>
      lesson.id === id && lesson.endedAt === null ? { ...lesson, endedAt: at } : lesson,
    ),
  })
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

/** The lesson currently under way, if there is one. */
export function runningLesson(book: Logbook): LessonRecord | null {
  return book.lessons.find((lesson) => lesson.endedAt === null) ?? null
}

export function replaceLogbook(next: Logbook): void {
  save(next)
}

export function clearLogbook(): void {
  save(EMPTY)
}
