import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { logbookFilePath, readLogbookFile, writeLogbookFile } from './records-logbook.ts'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ttf-logbook-file-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('the browser-shaped records file', () => {
  it('round-trips a Logbook next to records.db', () => {
    const path = logbookFilePath(join(dir, 'records.db'))
    writeLogbookFile({ updatedAt: 1_000, book: { roll: ['Amara'], revisedAt: 1_000 } }, path)

    expect(readLogbookFile(path)).toEqual({
      updatedAt: 1_000,
      book: { roll: ['Amara'], revisedAt: 1_000 },
    })
  })

  it('reads nothing from a missing or corrupt file rather than inventing a book', () => {
    expect(readLogbookFile(join(dir, 'missing.json'))).toBeNull()
    const path = join(dir, 'broken.json')
    writeLogbookFile({ updatedAt: 1, book: {} }, path)
    expect(readLogbookFile(path)?.book).toEqual({})
  })
})
