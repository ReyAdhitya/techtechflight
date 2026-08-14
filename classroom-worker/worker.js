/**
 * Classroom session sync, on Cloudflare Workers.
 *
 * Storage is a Durable Object per classroom code, NOT the workers KV store it started on.
 * KV's free allowance is 1,000 writes a day per account, and on 2026-08-12 an open board
 * spent all of them in about ninety minutes: reads kept working, writes answered
 * `KV put() limit exceeded for the day`, and a Teacher saw "Could not reach the classroom
 * cloud" on a page that had loaded perfectly. The board's write rate is fixed separately, in
 * `classroom-session.ts`; this is the other half, a store whose allowance a classroom cannot
 * exhaust in a morning.
 *
 * A Durable Object also suits the shape better than KV ever did: one room, one object, reads
 * and writes strongly consistent rather than eventually so. Two tablets and a board writing
 * within the same second now serialise instead of racing.
 *
 * A faithful port of `api/classroom.ts`, which still exists for anyone who restores Vercel
 * Blob billing. Same normalisation, same last-write-wins, same CORS, same status codes.
 *
 * GET  /?code=XXXX   read the session
 * PUT  /?code=XXXX   write it, last-write-wins on `updatedAt`
 *
 * Public read and write, no secret. The classroom code IS the shared secret, shouted across
 * the room by the Teacher.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

/** Same normalisation as the Vercel function, so a code means one thing on both. */
function normalizeCode(raw) {
  if (typeof raw !== 'string') return ''
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

/** One room. Its whole state is a single document, which is what a classroom session is. */
export class Classroom {
  constructor(state) {
    this.state = state
  }

  async fetch(request) {
    const url = new URL(request.url)

    if (request.method === 'GET') {
      const stored = await this.state.storage.get('doc')
      if (stored === undefined) return json({ error: 'No classroom with that code yet.' }, 404)
      return new Response(stored, {
        status: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    if (request.method === 'PUT') {
      let body
      try {
        body = await request.json()
      } catch {
        body = null
      }
      if (!body || typeof body !== 'object' || typeof body.updatedAt !== 'number') {
        return json({ error: 'Body must be a classroom session with updatedAt.' }, 400)
      }
      if (normalizeCode(body.code) !== normalizeCode(url.searchParams.get('code'))) {
        return json({ error: 'Body code must match query code.' }, 400)
      }

      /*
       * Merged, not refused. One document has two kinds of writer.
       *
       * The board owns the lesson and beats a heartbeat into the document every ten seconds.
       * Each tablet owns exactly one seat. Both PUT the whole document, because that is what
       * the document is — so whole-document last-write-wins loses a child every time the two
       * overlap, and they overlap constantly.
       *
       * That was the glitch: a Student tapped a Drone, the tablet PUT its seat on a base a
       * second old, and this refused it with a 409. The seat never reached the store, the next
       * poll handed the tablet a copy without it, and the screen bounced back to the Drone
       * picker. The Teacher's board said "Nobody is waiting" about the same child, which is
       * the same bug seen from the other end.
       *
       * So the newer document wins the lesson and the seats are unioned, each taken from
       * whichever copy heard from it last. A seat leaves only when the board rewrites the roll,
       * which is a decision rather than a race.
       */
      const prior = await this.state.storage.get('doc')
      let stored = null
      if (prior !== undefined) {
        try {
          const before = JSON.parse(prior)
          if (typeof before.updatedAt === 'number') stored = before
        } catch {
          /* replace corrupt */
        }
      }

      const next = merge(body, stored)
      await this.state.storage.put('doc', JSON.stringify(next))
      return json({ ok: true, updatedAt: next.updatedAt, seats: (next.seats ?? []).length })
    }

    return json({ error: 'Method not allowed' }, 405)
  }
}

/** How fresh one seat's row is. `seenAt` is its heartbeat; `joinedAt` is when it appeared. */
function seatAt(seat) {
  const seen = typeof seat.seenAt === 'number' ? seat.seenAt : 0
  const joined = typeof seat.joinedAt === 'number' ? seat.joinedAt : 0
  return Math.max(seen, joined)
}

/** Same Lesson, by id when there is one and by label when there is not. */
function sameLesson(a, b) {
  if (a.lessonId != null || b.lessonId != null) return a.lessonId === b.lessonId
  return (a.lessonLabel ?? '') === (b.lessonLabel ?? '')
}

/**
 * Two copies of one classroom, merged.
 *
 * The document clock decides the lesson; the seats are unioned. `mergeClassroomSessions` in
 * `web/lib/classroom-session.ts` is the same rule written again for the browser, because the
 * two runtimes cannot import from each other and a store that disagreed with the board about
 * this would put the glitch straight back.
 */
function merge(incoming, stored) {
  if (stored === null) return incoming

  /*
   * An open classroom from a *different* Lesson beats a closed one, whatever the clocks say.
   * Closing writes `endedAt` with a fresh `updatedAt`, so the corpse is the newest thing under
   * that code and the next Lesson's push looks older than it. Different Lesson, and not merely
   * live: a tablet holding a copy from a second before End the lesson would otherwise put the
   * classroom back on its next heartbeat, undoing a Teacher's decision on a timer.
   */
  const storedIsDead = stored.endedAt != null
  const incomingIsLive = incoming.endedAt == null && incoming.live === true
  if (storedIsDead && incomingIsLive && !sameLesson(stored, incoming)) return incoming

  const newer = stored.updatedAt > incoming.updatedAt ? stored : incoming
  const older = newer === stored ? incoming : stored

  const seats = new Map()
  for (const seat of [...(older.seats ?? []), ...(newer.seats ?? [])]) {
    if (typeof seat.studentId !== 'string') continue
    const held = seats.get(seat.studentId)
    if (held === undefined || seatAt(seat) >= seatAt(held)) seats.set(seat.studentId, seat)
  }

  return {
    ...newer,
    seats: [...seats.values()],
    updatedAt: Math.max(incoming.updatedAt, stored.updatedAt),
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

    const url = new URL(request.url)
    const code = normalizeCode(url.searchParams.get('code'))
    if (code.length < 4) {
      return json({ error: 'Query code must be at least four characters.' }, 400)
    }

    try {
      // The code names the room, so the same code always reaches the same object.
      const id = env.ROOM.idFromName(code)
      return await env.ROOM.get(id).fetch(request)
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'Classroom sync failed' }, 500)
    }
  },
}
