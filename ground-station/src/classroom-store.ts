import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The classroom, on the laptop.
 *
 * One JSON document per classroom code, in a file beside `classroom-source.json`. This is the
 * Cloudflare Worker's store moved into the room: no account, no token, no request cap, and no
 * internet. A travel router, a laptop and the iPads on it are the whole network.
 *
 * **The merge is ported, not rewritten.** `classroom-worker/worker.js` settles seats one at a
 * time on `rev`, hands ties to the copy already stored, and refuses nothing. The rule is
 * repeated here for the third runtime, because none of the three can import from the others and
 * `web/standards.test.ts` refuses them drifting apart.
 *
 * **Never settle any of it on `updatedAt`.** A board and a tablet do not share a clock: a laptop
 * a minute fast was answered 200 while a correct tablet got 409 forever and silently, and a
 * child who had joined was invisible on the Teacher's board for three days.
 */

const FILE_NAME = 'classrooms.json'

export interface ClassroomSeatLike {
  readonly studentId: string
  readonly rev?: number
  readonly seenAt?: number | null
  readonly joinedAt: number
  readonly [key: string]: unknown
}

export interface ClassroomDoc {
  readonly code: string
  readonly rev?: number
  readonly updatedAt: number
  readonly seats?: readonly ClassroomSeatLike[]
  readonly removedSeatIds?: readonly string[]
  readonly boardSeenAt?: number | null
  readonly [key: string]: unknown
}

export function classroomStorePath(fromDir = dirname(fileURLToPath(import.meta.url))): string {
  return resolve(fromDir, '..', FILE_NAME)
}

/** The later of two heartbeats, either of which may never have happened. */
function laterOf(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null) return b ?? null
  if (b == null) return a
  return Math.max(a, b)
}

/**
 * Two copies of one classroom, merged. The same rule as the Worker and the browser.
 *
 * `incoming` is the device that just wrote; `stored` is what this room already held. Ties go to
 * `stored`, because somebody has to be the order of record and it is the thing every device is
 * talking to.
 */
export function mergeClassrooms(incoming: ClassroomDoc, stored: ClassroomDoc | null): ClassroomDoc {
  if (stored === null) return incoming
  if (incoming.code !== stored.code) return incoming

  const room = (incoming.rev ?? 0) > (stored.rev ?? 0) ? incoming : stored
  const freed = new Set([...(incoming.removedSeatIds ?? []), ...(stored.removedSeatIds ?? [])])

  const seats: ClassroomSeatLike[] = []
  const ids = new Set([
    ...(incoming.seats ?? []).map((seat) => seat.studentId),
    ...(stored.seats ?? []).map((seat) => seat.studentId),
  ])
  for (const studentId of ids) {
    if (freed.has(studentId)) continue
    const theirs = (incoming.seats ?? []).find((seat) => seat.studentId === studentId) ?? null
    const ours = (stored.seats ?? []).find((seat) => seat.studentId === studentId) ?? null
    if (theirs === null) {
      seats.push(ours!)
      continue
    }
    if (ours === null) {
      seats.push(theirs)
      continue
    }
    const winner = (theirs.rev ?? 0) > (ours.rev ?? 0) ? theirs : ours
    seats.push({ ...winner, seenAt: laterOf(theirs.seenAt, ours.seenAt) })
  }

  return {
    ...room,
    seats: seats.sort((a, b) => a.joinedAt - b.joinedAt),
    removedSeatIds: [...freed],
    rev: Math.max(incoming.rev ?? 0, stored.rev ?? 0),
    updatedAt: Math.max(incoming.updatedAt ?? 0, stored.updatedAt ?? 0),
    boardSeenAt: laterOf(incoming.boardSeenAt, stored.boardSeenAt),
  }
}

/** Every classroom this laptop is holding, by code. */
type Rooms = Record<string, ClassroomDoc>

function load(path: string): Rooms {
  if (!existsSync(path)) return {}
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as Rooms
  } catch {
    /* A half-written file is not worth a lesson. Start again rather than refuse to run. */
    return {}
  }
}

/**
 * Written through a temporary file and renamed into place.
 *
 * A crash mid-lesson must not lose who is on which Drone, and a crash *during the write* must
 * not leave a half-document that reads as an empty room the next morning. Rename is the closest
 * thing a filesystem offers to atomic.
 */
function save(path: string, rooms: Rooms): void {
  mkdirSync(dirname(path), { recursive: true })
  const temporary = `${path}.writing`
  writeFileSync(temporary, `${JSON.stringify(rooms, null, 2)}\n`, 'utf8')
  renameSync(temporary, path)
}

export function normalizeCode(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

export function readClassroom(code: string, path = classroomStorePath()): ClassroomDoc | null {
  return load(path)[normalizeCode(code)] ?? null
}

/** Merge a device's copy into the room and persist it. Returns what everybody now reads. */
export function writeClassroom(
  incoming: ClassroomDoc,
  path = classroomStorePath(),
): ClassroomDoc {
  const code = normalizeCode(incoming.code)
  const rooms = load(path)
  const next = mergeClassrooms({ ...incoming, code }, rooms[code] ?? null)
  rooms[code] = next
  save(path, rooms)
  return next
}
