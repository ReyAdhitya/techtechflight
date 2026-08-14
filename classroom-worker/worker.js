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
 * PUT  /?code=XXXX   merge it with what is stored, seat by seat, settled on `rev`
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
       * Merged, seat by seat, and never refused.
       *
       * This was last-write-wins on `updatedAt` with a 409 for the loser, and both halves of
       * that were wrong. A board and a tablet do not share a clock: a laptop a minute fast was
       * answered 200 while a correct tablet got 409 forever, silently, and the child never
       * reached the board. And a whole-document write erases the other writer's half even when
       * it does land, which is how a Student tapped a Drone and bounced back to the picker.
       *
       * `mergeClassroomSessions` in `web/lib/classroom-session.ts` is the same rule for the
       * browser. **The two must agree or the glitch comes straight back**, so this is a
       * deliberate second copy rather than a summary: the room goes with the higher document
       * `rev`, seats are settled one at a time on their own `rev`, and a tie goes to the copy
       * already stored, because the store is where writes are put in an order.
       */
      const prior = await this.state.storage.get('doc')
      let stored = null
      if (prior !== undefined) {
        try {
          stored = JSON.parse(prior)
        } catch {
          /* replace corrupt */
        }
      }

      const next = merge(body, stored)
      await this.state.storage.put('doc', JSON.stringify(next))
      return json({ ok: true, rev: next.rev ?? 0, seats: (next.seats ?? []).length })
    }

    return json({ error: 'Method not allowed' }, 405)
  }
}

/** The later of two heartbeats, either of which may never have happened. */
function laterOf(a, b) {
  if (a == null) return b ?? null
  if (b == null) return a
  return Math.max(a, b)
}

/**
 * Two copies of one classroom, merged. The store's half of the rule.
 *
 * `incoming` is the device that just wrote; `stored` is what this room already held. Ties go to
 * `stored`, which is the same choice the browser makes when it hands ties to the store's copy:
 * somebody has to be the order of record, and it is the thing all the devices are talking to.
 *
 * Settled on `rev`, never on `updatedAt`. Two devices do not share a clock, and a classroom
 * that believed one was ninety seconds of a lost lesson.
 */
function merge(incoming, stored) {
  if (stored === null || stored === undefined) return incoming
  if (incoming.code !== stored.code) return incoming

  const room = (incoming.rev ?? 0) > (stored.rev ?? 0) ? incoming : stored
  const freed = new Set([
    ...(incoming.removedSeatIds ?? []),
    ...(stored.removedSeatIds ?? []),
  ])

  const seats = []
  const ids = new Set([
    ...(incoming.seats ?? []).map((seat) => seat.studentId),
    ...(stored.seats ?? []).map((seat) => seat.studentId),
  ])
  for (const studentId of ids) {
    if (freed.has(studentId)) continue
    const theirs = (incoming.seats ?? []).find((seat) => seat.studentId === studentId) ?? null
    const ours = (stored.seats ?? []).find((seat) => seat.studentId === studentId) ?? null
    if (theirs === null) {
      seats.push(ours)
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
