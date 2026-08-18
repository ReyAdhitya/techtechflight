import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  authorizeLogbookSync,
  offsiteBackupOn,
  resetLogbookSyncForTests,
  setOffsiteBackup,
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
    setOffsiteBackup(false)
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('PUTs the Logbook snapshot after a short debounce when a school has asked for it', async () => {
    vi.useFakeTimers()
    setOffsiteBackup(true)
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
       * suspended for unpaid billing since 9 August 2026; the copy moved with ADR-0034, and the
       * old endpoint is still reachable through the stored override.
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

/**
 * The cloud is off until somebody ticks a box (ADR-0035).
 *
 * The records are a file on the laptop, and a school is told we do not hold a copy. A secret
 * left in a browser from a previous plan must not quietly make that untrue.
 */
describe('the off-site backup switch', () => {
  afterEach(() => {
    setOffsiteBackup(false)
    window.localStorage.removeItem(LOGBOOK_SYNC_SECRET_KEY)
    resetLogbookSyncForTests()
  })

  it('sends nothing when a secret is set but nobody ticked the box', async () => {
    vi.useFakeTimers()
    writeLogbookSyncSecret('school-secret')
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 }))

    scheduleLogbookCloudPush({ ...readLogbook(), revisedAt: 1_000 }, fetchImpl)
    await vi.advanceTimersByTimeAsync(2_000)

    expect(fetchImpl).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('is off unless it was turned on', () => {
    expect(offsiteBackupOn()).toBe(false)
    setOffsiteBackup(true)
    expect(offsiteBackupOn()).toBe(true)
    setOffsiteBackup(false)
    expect(offsiteBackupOn()).toBe(false)
  })
})
