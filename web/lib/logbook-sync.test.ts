import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  authorizeLogbookSync,
  resetLogbookSyncForTests,
  scheduleLogbookCloudPush,
  writeLogbookSyncSecret,
  LOGBOOK_SYNC_SECRET_KEY,
} from './logbook-sync'
import { clearLogbook, readLogbook } from './logbook'

describe('Logbook sync auth', () => {
  it('accepts only the matching Bearer secret', () => {
    expect(authorizeLogbookSync('Bearer school-secret', 'school-secret')).toBe(true)
    expect(authorizeLogbookSync('Bearer wrong', 'school-secret')).toBe(false)
    expect(authorizeLogbookSync(null, 'school-secret')).toBe(false)
    expect(authorizeLogbookSync('Bearer x', undefined)).toBe(false)
  })
})

describe('debounced cloud push', () => {
  afterEach(() => {
    resetLogbookSyncForTests()
    clearLogbook()
    window.localStorage.removeItem(LOGBOOK_SYNC_SECRET_KEY)
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('PUTs the Logbook snapshot after a short debounce when a secret is set', async () => {
    vi.useFakeTimers()
    writeLogbookSyncSecret('school-secret')
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))

    const book = {
      ...readLogbook(),
      roster: [{ studentId: 'S-0001', name: 'Amara' }],
      roll: ['Amara'],
      revisedAt: 1_000,
    }
    scheduleLogbookCloudPush(book, fetchImpl)

    expect(fetchImpl).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1_300)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl).toHaveBeenCalledWith(
      /*
       * `/api/records` on Neon, not `/api/logbook` on Vercel Blob. The Blob stores have been
       * suspended for unpaid billing since 9 August 2026; the copy moved with ADR-0035 and the
       * old endpoint is still reachable through the override.
       */
      expect.stringContaining('/api/records'),
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          authorization: 'Bearer school-secret',
        }),
        body: expect.stringContaining('Amara'),
      }),
    )
  })

  it('does nothing when no secret is configured', async () => {
    vi.useFakeTimers()
    const fetchImpl = vi.fn()
    scheduleLogbookCloudPush(readLogbook(), fetchImpl)
    await vi.advanceTimersByTimeAsync(2_000)
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
