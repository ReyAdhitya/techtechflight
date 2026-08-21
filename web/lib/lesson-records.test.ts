import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearLogbook, readLogbook, replaceLogbookFromCloud } from './logbook'
import { CLASSROOM_SESSION_KEY } from './classroom-session'
import { MISSION_DRAFT_KEY } from './mission-draft'
import { TEAMS_KEY } from './teams'
import { DEMONSTRATION_LABEL, seedDemonstration } from './demonstration-seed'
import { MISSION_BRIEFING_KEY, tickAllMissionBriefRules } from '@/components/MissionBriefing'
import { CLEARANCES_KEY } from './clearance-store'
import { PRE_FLIGHT_SEVEN_KEY } from './preflight-seven'
import {
  hydrateRecordsFromFile,
  lessonSnapshotFromBrowser,
  persistLessonRecords,
} from './lesson-records'

const wipe = () => {
  clearLogbook()
  for (const key of [
    MISSION_DRAFT_KEY,
    CLEARANCES_KEY,
    TEAMS_KEY,
    PRE_FLIGHT_SEVEN_KEY,
    MISSION_BRIEFING_KEY,
    CLASSROOM_SESSION_KEY,
  ]) {
    window.localStorage.removeItem(key)
  }
}

beforeEach(wipe)
afterEach(wipe)

describe('a Lesson snapshot for the records file', () => {
  it('is nothing when no Lesson has run', () => {
    expect(lessonSnapshotFromBrowser()).toBeNull()
  })

  it('writes what a Teacher set, never a live reading', () => {
    seedDemonstration({ now: 1_000, tickBrief: tickAllMissionBriefRules })
    const snapshot = lessonSnapshotFromBrowser()

    expect(snapshot).not.toBeNull()
    expect(snapshot?.demonstration).toBe(true)
    expect(snapshot?.lessonLabel).toBe(DEMONSTRATION_LABEL)
    expect(snapshot?.seats).toHaveLength(3)
    expect(snapshot?.zones.length).toBeGreaterThan(0)
    expect(snapshot?.checkpoints.length).toBeGreaterThan(0)
    expect(JSON.stringify(snapshot)).not.toMatch(/altitude/)
    expect(JSON.stringify(snapshot)).not.toMatch(/battery/)
  })
})

describe('persisting at a Lesson boundary', () => {
  it('PUTs the Lesson and the Logbook to the ground station', () => {
    seedDemonstration({ now: 1_000, tickBrief: tickAllMissionBriefRules })
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))

    persistLessonRecords(undefined, fetchImpl)

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    const sent = JSON.stringify(fetchImpl.mock.calls)
    expect(sent).toContain('/api/records')
    expect(sent).toContain('/api/records/logbook')
  })

  it('does not reach a live ground station from the test suite', () => {
    seedDemonstration({ now: 1_000, tickBrief: tickAllMissionBriefRules })
    const fetchImpl = vi.fn()
    vi.stubGlobal('fetch', fetchImpl)
    try {
      persistLessonRecords()
      expect(fetchImpl).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('the file winning over the browser', () => {
  it('replaces a cleared browser from the file', async () => {
    const fileBook = { ...readLogbook(), roll: ['Amara'], revisedAt: 5_000 }
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ updatedAt: 5_000, book: fileBook }), { status: 200 }),
    )

    const result = await hydrateRecordsFromFile(fetchImpl)

    expect(result).toBe('file')
    expect(readLogbook().roll).toEqual(['Amara'])
  })

  it('keeps a newer browser copy', async () => {
    replaceLogbookFromCloud({ ...readLogbook(), roll: ['Priya'], revisedAt: 9_000 }, 9_000)
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ updatedAt: 1_000, book: { ...readLogbook(), roll: ['Amara'] } }),
          { status: 200 },
        ),
    )

    const result = await hydrateRecordsFromFile(fetchImpl)

    expect(result).toBe('browser')
    expect(readLogbook().roll).toEqual(['Priya'])
  })

  it('lets the file win a tie, the way the classroom store does', async () => {
    replaceLogbookFromCloud({ ...readLogbook(), roll: ['Local'], revisedAt: 4_000 }, 4_000)
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            updatedAt: 4_000,
            book: { ...readLogbook(), roll: ['File'], revisedAt: 4_000 },
          }),
          { status: 200 },
        ),
    )

    expect(await hydrateRecordsFromFile(fetchImpl)).toBe('file')
    expect(readLogbook().roll).toEqual(['File'])
  })
})
