/**
 * The classroom store, on Cloudflare Workers + KV.
 *
 * Same shape as `api/classroom.ts`, which it replaces rather than extends: GET and PUT one
 * JSON document per classroom code, no secret, last write wins by `updatedAt`. The code
 * shouted across the room is the only key there is, which is the whole design (ADR-0025).
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
         * Last write wins by `updatedAt`, and a stale write is refused rather than dropped
         * silently. KV is eventually consistent across regions, so this is a courtesy against
         * the ordinary case — two tabs on one laptop — and not a lock. The board treats 409 as
         * "somebody else is newer", which is the honest reading either way.
         */
        const prior = await env.CLASSROOMS.get(code, 'text')
        if (prior !== null) {
          try {
            const before = JSON.parse(prior) as { updatedAt?: unknown }
            if (typeof before.updatedAt === 'number' && before.updatedAt > body.updatedAt) {
              return json(
                {
                  error: 'Cloud copy is newer (last-write-wins).',
                  updatedAt: before.updatedAt,
                  store: 'cloudflare-kv',
                },
                409,
              )
            }
          } catch {
            /* replace corrupt */
          }
        }

        await env.CLASSROOMS.put(code, JSON.stringify(body), { expirationTtl: TTL_SECONDS })
        return json({ ok: true, updatedAt: body.updatedAt, store: 'cloudflare-kv' })
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
