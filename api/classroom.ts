import type { VercelRequest, VercelResponse } from '@vercel/node'
import { get, put } from '@vercel/blob'

/**
 * Classroom session sync for Student iPads (#628).
 *
 * GET / PUT by `?code=` — four-character classroom code.
 * Public read/write of the session document (no secret): the code is the shared secret
 * shouted across the room. Private Blob at `techtechflight/classroom/<CODE>.json`.
 * Last-write-wins on PUT by `updatedAt`.
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
    res.status(400).json({ error: 'Query code must be at least four characters.' })
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
      const session = JSON.parse(await readStream(blob.stream)) as { code?: string }
      res.status(200).json(session)
      return
    }

    if (req.method === 'PUT') {
      const raw = req.body
      const body = (
        typeof raw === 'string'
          ? (JSON.parse(raw) as { code?: string; updatedAt?: number })
          : raw
      ) as { code?: string; updatedAt?: number } | null
      if (!body || typeof body !== 'object' || typeof body.updatedAt !== 'number') {
        res.status(400).json({ error: 'Body must be a classroom session with updatedAt.' })
        return
      }
      const bodyCode = normalizeCode(body.code)
      if (bodyCode !== code) {
        res.status(400).json({ error: 'Body code must match query code.' })
        return
      }

      const existing = await get(pathname, { access: 'private', token })
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
          /* replace corrupt */
        }
      }

      await put(pathname, JSON.stringify(body), {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        token,
      })
      res.status(200).json({ ok: true, updatedAt: body.updatedAt })
      return
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Classroom sync failed',
    })
  }
}
