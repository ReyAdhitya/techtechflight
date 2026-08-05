import type { VercelRequest, VercelResponse } from '@vercel/node'
import { get, put } from '@vercel/blob'

/**
 * Classroom channel for Teacher ↔ Student phones (#628).
 *
 * GET / PUT `?code=ABCD`. No Bearer secret — the short code *is* the shared secret for
 * one period. Private Blob path per code. Last-write-wins on PUT by `updatedAt`.
 */

function normalizeCode(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

function pathnameFor(code: string): string {
  return `techtechflight/classroom/${code}.json`
}

async function readStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  return new Response(stream).text()
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  const code = normalizeCode(req.query.code)
  if (code.length < 4) {
    res.status(400).json({ error: 'Classroom code required (?code=ABCD).' })
    return
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    res.status(503).json({ error: 'Classroom store is not configured (BLOB_READ_WRITE_TOKEN).' })
    return
  }

  const pathname = pathnameFor(code)

  try {
    if (req.method === 'GET') {
      const blob = await get(pathname, { access: 'private', token })
      if (!blob) {
        res.status(404).json({ error: 'No classroom with that code yet.' })
        return
      }
      const session = JSON.parse(await readStream(blob.stream))
      res.status(200).json(session)
      return
    }

    if (req.method === 'PUT') {
      const body = req.body as { updatedAt?: number; code?: string } | null
      if (!body || typeof body.updatedAt !== 'number') {
        res.status(400).json({ error: 'Body must include updatedAt.' })
        return
      }

      const existing = await get(pathname, { access: 'private', token })
      if (existing) {
        try {
          const prior = JSON.parse(await readStream(existing.stream)) as { updatedAt?: number }
          if (typeof prior.updatedAt === 'number' && prior.updatedAt > body.updatedAt) {
            res.status(409).json({
              error: 'Cloud classroom is newer.',
              updatedAt: prior.updatedAt,
            })
            return
          }
        } catch {
          /* replace corrupt */
        }
      }

      await put(pathname, JSON.stringify({ ...body, code }), {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        token,
      })
      res.status(200).json({ ok: true, updatedAt: body.updatedAt, code })
      return
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Classroom store failed'
    res.status(500).json({ error: message })
  }
}
