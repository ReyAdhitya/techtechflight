/**
 * The classroom store, on Cloudflare Workers + KV.
 *
 * Same shape as `api/classroom.ts`, which it replaces: GET and PUT one JSON document per
 * classroom code, no secret. The code shouted across the room is the only key there is, which
 * is the whole design (ADR-0025).
 *
 * One thing is not the same, and it is a fix rather than a flourish: a PUT is **merged** with
 * what is stored instead of replacing it. Whole-document last-write-wins loses a child every
 * time a tablet and the board write within a heartbeat of each other. See `merge`.
 *
 * **Why it moved.** The Vercel Blob stores went to 500 on 9 August 2026 and stayed there —
 * suspended for inactive billing, and the owner is not adding a card. A classroom store that
 * needs a payment method to survive a quiet fortnight is not a classroom store.
 *
 * **Why Workers and not Supabase.** The requirement is that it never sleeps and never waits
 * for a human. Supabase pauses a free project after about a week idle and resumes only when
 * somebody clicks a button in a dashboard — which, on a Tuesday morning with a class in the
 * room, is the same as being down. A Worker has no idle state to come back from.
 *
 * **The free tier is not close to tight.** A classroom document is 5.42 KB; the free tier is
 * 100,000 KV reads and 1,000 writes a day. A tablet polls every 2.5 s, so thirty tablets in a
 * forty minute lesson is about 29,000 reads — three lessons a day fits, and writes are the
 * scarce side: the board debounces to roughly one per change, and a busy lesson is dozens.
 */

export interface Env {
  /** KV namespace holding one JSON document per classroom code. */
  CLASSROOMS: KVNamespace
}

/** Only the two fields the merge below needs. The rest of the document is opaque here. */
interface ClassroomDoc {
  readonly updatedAt: number
  readonly seats?: readonly { readonly studentId?: unknown; readonly seenAt?: unknown; readonly joinedAt?: unknown }[]
  readonly [key: string]: unknown
}

/** How fresh one seat's row is. `seenAt` is its heartbeat; `joinedAt` is when it appeared. */
function seatAt(seat: { readonly seenAt?: unknown; readonly joinedAt?: unknown }): number {
  const seen = typeof seat.seenAt === 'number' ? seat.seenAt : 0
  const joined = typeof seat.joinedAt === 'number' ? seat.joinedAt : 0
  return Math.max(seen, joined)
}

/**
 * One document, two kinds of writer, and a lost update if you take either whole.
 *
 * The Teacher's board owns the lesson — the Scenario, the zones, which craft are in it — and
 * beats a heartbeat into the document every ten seconds. Each tablet owns exactly one seat and
 * writes when a child joins, takes a Drone or asks to take off. Both PUT the whole document,
 * because that is what the document is.
 *
 * Last-write-wins on the whole thing therefore loses a child: the tablet PUTs a copy carrying
 * its new seat, the board's next heartbeat PUTs a copy that predates it, and the seat is gone
 * from the store while both screens still show it. It went unseen for the three days the store
 * was returning 500 to everybody, and it is the first thing that bites once it answers.
 *
 * So: **the newer document wins the lesson, and the seats are unioned.** Each seat is taken
 * from whichever copy has the fresher row, by `seenAt` then `joinedAt`. Both writers already
 * stamp those — this reads what is there rather than asking for anything new — and a seat is
 * only ever removed by the board rewriting the roll, which is a decision rather than a race.
 */
function merge(incoming: ClassroomDoc, stored: ClassroomDoc | null): ClassroomDoc {
  if (stored === null) return incoming

  const newer = stored.updatedAt > incoming.updatedAt ? stored : incoming
  const older = newer === stored ? incoming : stored

  const seats = new Map<string, { readonly studentId?: unknown }>()
  for (const seat of [...(older.seats ?? []), ...(newer.seats ?? [])]) {
    const id = typeof seat.studentId === 'string' ? seat.studentId : null
    if (id === null) continue
    const held = seats.get(id)
    if (held === undefined || seatAt(seat) >= seatAt(held)) seats.set(id, seat)
  }

  return { ...newer, seats: [...seats.values()], updatedAt: Math.max(incoming.updatedAt, stored.updatedAt) }
}

/** How long a classroom document lives in KV without being written again. */
const TTL_SECONDS = 60 * 60 * 24 * 2

const CORS: Record<string, string> = {
  /*
   * Open, because the board is served from Vercel, from a laptop on :4321 and from whatever
   * address a school's iPad reaches it on, and the document behind this is already public to
   * anybody holding four characters a Teacher shouted.
   */
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, PUT, OPTIONS',
  'access-control-allow-headers': 'Content-Type',
}

function normalizeCode(raw: string | null): string {
  if (typeof raw !== 'string') return ''
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

    /*
     * A liveness answer that costs no KV operation. The board asks for it to tell "this store
     * is not configured" apart from "this store is refusing", which are two different
     * sentences to a Teacher and were one sentence for three days.
     */
    const url = new URL(request.url)
    if (url.pathname === '/health') {
      return json({ ok: true, store: 'cloudflare-kv' })
    }

    const code = normalizeCode(url.searchParams.get('code'))
    if (code.length < 4) {
      return json({ error: 'Query code must be at least four characters.', store: 'cloudflare-kv' }, 400)
    }

    if (env.CLASSROOMS === undefined) {
      return json(
        { error: 'Classroom store is not bound (KV namespace CLASSROOMS).', store: 'cloudflare-kv' },
        503,
      )
    }

    try {
      if (request.method === 'GET') {
        const stored = await env.CLASSROOMS.get(code, 'text')
        if (stored === null) {
          return json({ error: 'No classroom with that code yet.', store: 'cloudflare-kv' }, 404)
        }
        return new Response(stored, {
          status: 200,
          headers: { 'content-type': 'application/json', ...CORS },
        })
      }

      if (request.method === 'PUT') {
        const body = (await request.json().catch(() => null)) as {
          code?: unknown
          updatedAt?: unknown
        } | null
        if (!body || typeof body !== 'object' || typeof body.updatedAt !== 'number') {
          return json(
            { error: 'Body must be a classroom session with updatedAt.', store: 'cloudflare-kv' },
            400,
          )
        }
        if (normalizeCode(typeof body.code === 'string' ? body.code : '') !== code) {
          return json({ error: 'Body code must match query code.', store: 'cloudflare-kv' }, 400)
        }

        /*
         * Merged rather than refused. A stale write used to get a 409, which is right for a
         * lock and wrong here: a tablet writing its own seat on a base a few seconds old is
         * the ordinary case, and refusing it drops the child. See `merge`.
         */
        const prior = await env.CLASSROOMS.get(code, 'text')
        let stored: ClassroomDoc | null = null
        if (prior !== null) {
          try {
            const before = JSON.parse(prior) as ClassroomDoc
            if (typeof before.updatedAt === 'number') stored = before
          } catch {
            /* replace corrupt */
          }
        }

        const next = merge(body as unknown as ClassroomDoc, stored)
        await env.CLASSROOMS.put(code, JSON.stringify(next), { expirationTtl: TTL_SECONDS })
        return json({
          ok: true,
          updatedAt: next.updatedAt,
          seats: (next.seats ?? []).length,
          store: 'cloudflare-kv',
        })
      }

      return json({ error: 'Method not allowed', store: 'cloudflare-kv' }, 405)
    } catch (error) {
      return json(
        {
          error: error instanceof Error ? error.message : 'Classroom sync failed',
          store: 'cloudflare-kv',
        },
        500,
      )
    }
  },
}
