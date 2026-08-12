/**
 * Classroom session sync, on Cloudflare Workers and KV.
 *
 * A faithful port of `api/classroom.ts`, which still exists and still works if Vercel Blob
 * billing is ever restored. This one exists because on 2026-08-12 every Blob store on the
 * account read `Suspended`, `Billing State: Inactive`, so `/api/classroom` returned 500 for
 * three days and no second device could join a lesson.
 *
 * Chosen over Supabase on one point: this never sleeps. Supabase pauses a free project after
 * about a week idle and waits for a human to click, and the owner had already lost days to
 * storage that switched itself off without saying so.
 *
 * GET  /?code=XXXX   read the session
 * PUT  /?code=XXXX   write it, last-write-wins on `updatedAt`
 *
 * Public read and write, no secret. The classroom code IS the shared secret, shouted across
 * the room by the Teacher, exactly as the Vercel function has it.
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

function keyFor(code) {
  return `techtechflight/classroom/${code}.json`
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

    const url = new URL(request.url)
    const code = normalizeCode(url.searchParams.get('code'))
    if (code.length < 4) {
      return json({ error: 'Query code must be at least four characters.' }, 400)
    }

    const key = keyFor(code)

    try {
      if (request.method === 'GET') {
        const stored = await env.CLASSROOM.get(key)
        if (stored === null) return json({ error: 'No classroom with that code yet.' }, 404)
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
        if (normalizeCode(body.code) !== code) {
          return json({ error: 'Body code must match query code.' }, 400)
        }

        /*
         * Last-write-wins, and the older writer is told rather than silently dropped. A
         * Teacher's board and a tablet can both push within the same second.
         */
        const prior = await env.CLASSROOM.get(key)
        if (prior !== null) {
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

        await env.CLASSROOM.put(key, JSON.stringify(body))
        return json({ ok: true, updatedAt: body.updatedAt })
      }

      return json({ error: 'Method not allowed' }, 405)
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'Classroom sync failed' }, 500)
    }
  },
}
