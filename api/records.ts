import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

/**
 * The records copy, on Neon Postgres (ADR-0035).
 *
 * **The browser is the record and this is the copy.** A school hall with poor wifi still has
 * to teach a lesson, and a Teacher who cannot mark attendance because the connection dropped
 * is a real failure with children in the room. So every screen writes `localStorage` first and
 * succeeds whether or not this endpoint answers; this exists so the same records open on
 * another machine and survive a lost laptop.
 *
 * The shape is `logbook-sync`'s, finished rather than replaced: GET and PUT one snapshot
 * behind `Authorization: Bearer <LOGBOOK_SYNC_SECRET>`, last write wins by `updatedAt`. What
 * changed is where it lands — Vercel Blob has been suspended for unpaid billing since 9 August
 * and is not coming back.
 *
 * **Nothing live.** The snapshot is the Logbook and the sealed side records: who flew, which
 * craft, attendance, notes. No altitude, no battery, no position, ever.
 *
 * Neon rather than Supabase for the same reason the classroom store is a Worker: it wakes
 * itself on the next request instead of waiting for somebody to click a button in a dashboard.
 * It sleeps after five minutes idle and resumes in about half a second, which is affordable
 * precisely because nothing a Teacher does waits on it.
 */

function authorize(header: string | undefined, secret: string | undefined): boolean {
  if (!secret || !header) return false
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match?.[1] === secret
}

/**
 * The snapshot table, created on first use.
 *
 * The relational schema in `db/schema.sql` is what the records *are*; this one row per school
 * is how a browser hands over everything it holds in a single write. They are two views of the
 * same records and the projection from one to the other is a separate piece of work — kept
 * separate deliberately, because a sync that half-writes a normalised graph over a dropping
 * school connection is worse than one that writes a document or does not.
 */
const CREATE = `
  CREATE TABLE IF NOT EXISTS records_snapshot (
    school_key   text PRIMARY KEY,
    updated_at   bigint NOT NULL,
    snapshot     jsonb NOT NULL,
    written_at   timestamptz NOT NULL DEFAULT now()
  )
`

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  const secret = process.env.LOGBOOK_SYNC_SECRET
  const auth = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined
  if (!authorize(auth, secret)) {
    res.status(401).json({
      error: 'Unauthorized — set LOGBOOK_SYNC_SECRET on the host and the same secret on the board.',
      store: 'neon',
    })
    return
  }

  const url = process.env.DATABASE_URL
  if (!url) {
    res.status(503).json({
      error: 'Records store is not configured (DATABASE_URL).',
      store: 'neon',
    })
    return
  }

  /* One key per school. A single-school install leaves it alone and gets `default`. */
  const schoolKey =
    typeof req.query.school === 'string' && req.query.school.trim() !== ''
      ? req.query.school.trim().slice(0, 64)
      : 'default'

  try {
    const sql = neon(url)
    await sql(CREATE)

    if (req.method === 'GET') {
      const rows = (await sql(
        'SELECT updated_at, snapshot FROM records_snapshot WHERE school_key = $1',
        [schoolKey],
      )) as { updated_at: string; snapshot: unknown }[]

      const row = rows[0]
      if (!row) {
        res.status(404).json({ error: 'No records copy yet.', store: 'neon' })
        return
      }
      res.status(200).json({ updatedAt: Number(row.updated_at), book: row.snapshot })
      return
    }

    if (req.method === 'PUT') {
      const raw = req.body
      const body = (typeof raw === 'string' ? JSON.parse(raw) : raw) as {
        updatedAt?: unknown
        book?: unknown
      } | null

      if (!body || typeof body.updatedAt !== 'number' || typeof body.book !== 'object') {
        res.status(400).json({
          error: 'Body must be { updatedAt, book }.',
          store: 'neon',
        })
        return
      }

      /*
       * Last write wins by `updatedAt`, decided in the statement rather than by reading first.
       * Two laptops in one school syncing at once is rare and a lost read-then-write would be
       * silent, which is the failure a records copy is least allowed to have.
       */
      const written = (await sql(
        `INSERT INTO records_snapshot (school_key, updated_at, snapshot)
         VALUES ($1, $2, $3)
         ON CONFLICT (school_key) DO UPDATE
           SET updated_at = EXCLUDED.updated_at,
               snapshot = EXCLUDED.snapshot,
               written_at = now()
           WHERE records_snapshot.updated_at <= EXCLUDED.updated_at
         RETURNING updated_at`,
        [schoolKey, body.updatedAt, JSON.stringify(body.book)],
      )) as { updated_at: string }[]

      if (written.length === 0) {
        res.status(409).json({ error: 'The stored copy is newer.', store: 'neon' })
        return
      }

      res.status(200).json({ ok: true, updatedAt: body.updatedAt, store: 'neon' })
      return
    }

    res.status(405).json({ error: 'Method not allowed', store: 'neon' })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Records sync failed',
      store: 'neon',
    })
  }
}
