import type { DroneId } from '@techtechflight/contract'
import type { MissionCheckpoint, ScenarioId } from './mission.ts'
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
  readonly checkpointIndex: number
  readonly score: number | null
  readonly joinedAt: number
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
  readonly zones: readonly Zone[]
  readonly seats: readonly ClassroomSeat[]
  readonly instructions: readonly ClassroomInstruction[]
  /** Mission under way — Students may progress past briefing. */
  readonly live: boolean
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
    zones: [],
    seats: [],
    instructions: [],
    live: false,
  }
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
    return parsed
  } catch {
    return null
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
  readonly zones: readonly Zone[]
  readonly live?: boolean
  readonly now?: number
}): ClassroomSession {
  const now = input.now ?? Date.now()
  const existing = readClassroomSession()
  const code = normalizeClassroomCode(input.code ?? existing?.code ?? mintClassroomCode(now))
  const base = existing && existing.code === code ? existing : emptySession(code, now)
  return writeClassroomSession({
    ...base,
    code,
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
    zones: input.zones,
    live: input.live ?? true,
    updatedAt: now,
  })
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
): { readonly session: ClassroomSession; readonly seat: ClassroomSeat } {
  const trimmed = name.trim() || 'Student'
  const local = readStudentSeatLocal()
  const existing =
    local && local.code === session.code
      ? session.seats.find((row) => row.studentId === local.studentId)
      : undefined

  if (existing) {
    const seat = { ...existing, name: trimmed }
    const seats = session.seats.map((row) => (row.studentId === seat.studentId ? seat : row))
    const next = writeClassroomSession({ ...session, seats })
    writeStudentSeatLocal({ code: session.code, studentId: seat.studentId, name: trimmed })
    return { session: next, seat }
  }

  const seat: ClassroomSeat = {
    studentId: `stu-${now.toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`,
    name: trimmed,
    droneId: null,
    droneName: null,
    phase: session.live ? 'briefing' : 'briefing',
    takeoffRequestedAt: null,
    clearedAt: null,
    heldAt: null,
    checkpointIndex: 0,
    score: null,
    joinedAt: now,
  }

  // Auto-seat onto the next free Mission craft name if the Teacher already listed craft.
  const taken = new Set(session.seats.map((row) => row.droneId).filter(Boolean))
  const freeSlot = session.seats.length // display order only; Teacher assigns names later

  void freeSlot
  void taken

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
  return updateSeatPhase(session, studentId, 'request-takeoff', {
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
  const matched = session.seats.filter((seat) => seat.droneId === droneId)
  const targets =
    matched.length > 0
      ? matched
      : session.seats.filter((seat) => seat.phase === 'awaiting-clearance')
  let next = session
  for (const seat of targets) {
    next = grantSeatClearance(next, seat.studentId, now)
  }
  return next
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
  const remote = await pullClassroomFromCloud(normalized)
  if (remote) {
    try {
      window.localStorage.setItem(CLASSROOM_SESSION_KEY, JSON.stringify(remote))
    } catch {
      /* ignore */
    }
    return remote
  }
  const local = readClassroomSession()
  if (local && local.code === normalized) return local
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
