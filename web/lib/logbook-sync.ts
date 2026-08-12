import type { Logbook } from '@/lib/logbook'

/**
 * Client dual-write / hydrate for the records copy (#93, finished by ADR-0035).
 *
 * **The local save always wins, and it wins first.** A school hall with poor wifi still has to
 * teach a lesson: a Teacher who cannot mark attendance because the connection dropped is a
 * real failure with children in the room. Everything here runs after the record is already
 * safe in this browser, and every failure below is a shrug.
 *
 * When a sync secret is set and the network answers, a debounced PUT mirrors the snapshot to
 * the records endpoint. That is `/api/records` on Neon by default — Vercel Blob, which
 * `/api/logbook` writes to, has been suspended for unpaid billing since 9 August 2026.
 * `NEXT_PUBLIC_LOGBOOK_SYNC_URL` or the stored override still point it anywhere else.
 */

export const LOGBOOK_SYNC_SECRET_KEY = 'techtechflight:logbook-sync-secret'
export const LOGBOOK_SYNC_URL_KEY = 'techtechflight:logbook-sync-url'

export type LogbookCloudSnapshot = {
  readonly updatedAt: number
  readonly book: Logbook
}

export function authorizeLogbookSync(
  header: string | null,
  secret: string | undefined,
): boolean {
  if (!secret) return false
  if (!header) return false
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match?.[1] === secret
}

export function readLogbookSyncSecret(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem(LOGBOOK_SYNC_SECRET_KEY)
    if (stored && stored.trim() !== '') return stored.trim()
  } catch {
    /* ignore */
  }
  const fromEnv = process.env.NEXT_PUBLIC_LOGBOOK_SYNC_SECRET
  return fromEnv && fromEnv.trim() !== '' ? fromEnv.trim() : null
}

export function writeLogbookSyncSecret(secret: string): void {
  if (typeof window === 'undefined') return
  try {
    if (secret.trim() === '') window.localStorage.removeItem(LOGBOOK_SYNC_SECRET_KEY)
    else window.localStorage.setItem(LOGBOOK_SYNC_SECRET_KEY, secret.trim())
  } catch {
    /* ignore */
  }
}

/**
 * Where the copy goes.
 *
 * `/api/records` (Neon) by default. An absolute override in `localStorage` or in
 * `NEXT_PUBLIC_LOGBOOK_SYNC_URL` beats it, which is how a school points at their own host and
 * how `/api/logbook` is still reachable if the Blob billing is ever restored.
 */
export const RECORDS_ENDPOINT = '/api/records'

export function logbookSyncUrl(): string {
  if (typeof window === 'undefined') return RECORDS_ENDPOINT
  try {
    const override = window.localStorage.getItem(LOGBOOK_SYNC_URL_KEY)
    if (override && /^https?:\/\//i.test(override)) return override.replace(/\/$/, '')
  } catch {
    /* ignore */
  }
  const fromEnv = process.env.NEXT_PUBLIC_LOGBOOK_SYNC_URL
  if (fromEnv && fromEnv.trim() !== '') return fromEnv.trim().replace(/\/$/, '')
  return RECORDS_ENDPOINT
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let pending: LogbookCloudSnapshot | null = null

export function scheduleLogbookCloudPush(
  book: Logbook,
  fetchImpl: typeof fetch = fetch,
): void {
  const secret = readLogbookSyncSecret()
  if (!secret) return
  pending = { updatedAt: book.revisedAt ?? Date.now(), book }
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    const snapshot = pending
    pending = null
    debounceTimer = null
    if (!snapshot) return
    void pushLogbookSnapshot(snapshot, fetchImpl)
  }, 1_200)
}

export async function pushLogbookSnapshot(
  snapshot: LogbookCloudSnapshot,
  fetchImpl: typeof fetch = fetch,
): Promise<'ok' | 'skipped' | 'error'> {
  const secret = readLogbookSyncSecret()
  if (!secret) return 'skipped'
  try {
    const response = await fetchImpl(logbookSyncUrl(), {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${secret}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(snapshot),
    })
    return response.ok || response.status === 409 ? 'ok' : 'error'
  } catch {
    return 'error'
  }
}

export async function fetchLogbookSnapshot(
  fetchImpl: typeof fetch = fetch,
): Promise<LogbookCloudSnapshot | null> {
  const secret = readLogbookSyncSecret()
  if (!secret) return null
  try {
    const response = await fetchImpl(logbookSyncUrl(), {
      headers: { authorization: `Bearer ${secret}` },
    })
    if (!response.ok) return null
    const body = (await response.json()) as LogbookCloudSnapshot
    if (typeof body.updatedAt !== 'number' || !body.book || typeof body.book !== 'object') {
      return null
    }
    return body
  } catch {
    return null
  }
}

/** Flush pending debounce (tests). */
export function resetLogbookSyncForTests(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = null
  pending = null
}
