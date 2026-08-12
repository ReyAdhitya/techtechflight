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
       * Last-write-wins, and the older writer is told rather than silently dropped. A board
       * and a tablet can both push within the same second.
       */
      const prior = await this.state.storage.get('doc')
      if (prior !== undefined) {
        try {
          const before = JSON.parse(prior)
          if (typeof before.updatedAt === 'number' && before.updatedAt > body.updatedAt) {
            return json(
              { error: 'Cloud copy is newer (last-write-wins).', updatedAt: before.updatedAt },
              409,
            )
          }
        } catch {
          /* replace corrupt */
        }
      }

      await this.state.storage.put('doc', JSON.stringify(body))
      return json({ ok: true, updatedAt: body.updatedAt })
    }

    return json({ error: 'Method not allowed' }, 405)
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
