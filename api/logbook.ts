import type { VercelRequest, VercelResponse } from '@vercel/node'
import { get, put } from '@vercel/blob'

/**
 * Logbook cloud copy for the Vercel preview (#93 / plan #83).
 *
 * GET / PUT with Authorization: Bearer <LOGBOOK_SYNC_SECRET>.
 * Private Blob at a fixed pathname. Last-write-wins on PUT.
 * The Next board stays a static export (ADR-0005 / ADR-0015).
 */

const PATHNAME = 'techtechflight/logbook-default.json'

function authorize(header: string | undefined, secret: string | undefined): boolean {
  if (!secret || !header) return false
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match?.[1] === secret
}

async function readStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  return new Response(stream).text()
}

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
      error: 'Unauthorized — set LOGBOOK_SYNC_SECRET on Vercel and the same secret on the board.',
    })
    return
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    res.status(503).json({ error: 'Cloud Logbook store is not configured (BLOB_READ_WRITE_TOKEN).' })
    return
  }

  try {
    if (req.method === 'GET') {
      const blob = await get(PATHNAME, { access: 'private', token })
      if (!blob) {
        res.status(404).json({ error: 'No cloud Logbook yet — sync from the classroom laptop.' })
        return
      }
      const snapshot = JSON.parse(await readStream(blob.stream)) as {
        updatedAt?: number
        book?: unknown
      }
      res.status(200).json(snapshot)
      return
    }

    if (req.method === 'PUT') {
      const body = req.body as { updatedAt?: number; book?: unknown } | null
      if (!body || typeof body.updatedAt !== 'number' || body.book === undefined || body.book === null) {
        res.status(400).json({ error: 'Body must be { updatedAt: number, book: object }.' })
        return
      }

      const existing = await get(PATHNAME, { access: 'private', token })
      if (existing) {
        try {
          const prior = JSON.parse(await readStream(existing.stream)) as { updatedAt?: number }
          if (typeof prior.updatedAt === 'number' && prior.updatedAt > body.updatedAt) {
            res.status(409).json({
              error: 'Cloud copy is newer (last-write-wins).',
              updatedAt: prior.updatedAt,
            })
            return
          }
        } catch {
          /* replace corrupt cloud copy */
        }
      }

      const snapshot = { updatedAt: body.updatedAt, book: body.book }
      await put(PATHNAME, JSON.stringify(snapshot), {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        token,
      })
      res.status(200).json({ ok: true, updatedAt: snapshot.updatedAt })
      return
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Logbook sync failed',
    })
  }
}
