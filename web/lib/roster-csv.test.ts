import { beforeEach, describe, expect, it } from 'vitest'
import { applyRosterCsv, parseRosterCsv, splitCsvLine } from './roster-csv'
import { clearLogbook, readLogbook, registerStudent } from './logbook'

beforeEach(() => {
  clearLogbook()
})

describe('splitCsvLine', () => {
  it('honours quoted commas', () => {
    expect(splitCsvLine('Amara,"Last, Jr",S-1')).toEqual(['Amara', 'Last, Jr', 'S-1'])
  })
})

describe('parseRosterCsv', () => {
  it('accepts a Name header and rows', () => {
    const result = parseRosterCsv('name\nAmara\nPriya\n')
    expect(result).toEqual({
      ok: true,
      rows: [{ name: 'Amara' }, { name: 'Priya' }],
    })
  })

  it('accepts studentId with Name', () => {
    const result = parseRosterCsv('studentId,name\nS-0001,Amara\nS-0002,Priya\n')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows).toEqual([
      { name: 'Amara', studentId: 'S-0001' },
      { name: 'Priya', studentId: 'S-0002' },
    ])
  })

  it('accepts headerless one name per line', () => {
    const result = parseRosterCsv('Amara\nPriya\n')
    expect(result).toEqual({
      ok: true,
      rows: [{ name: 'Amara' }, { name: 'Priya' }],
    })
  })

  it('refuses an empty file and says why', () => {
    expect(parseRosterCsv('')).toEqual({
      ok: false,
      reason: 'The file is empty — add a name column and try again.',
    })
  })

  it('refuses a duplicate name and says why', () => {
    const result = parseRosterCsv('name\nAmara\nAmara\n')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/Amara/)
    expect(result.reason).toMatch(/twice/)
  })

  it('refuses a mixed id column', () => {
    const result = parseRosterCsv('studentId,name\nS-0001,Amara\n,Priya\n')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/studentId/)
  })
})

describe('applyRosterCsv', () => {
  it('writes a valid name list into the Logbook', () => {
    const result = applyRosterCsv('name\nAmara\nPriya\n')
    expect(result.ok).toBe(true)
    expect(readLogbook().roster.map((student) => student.name)).toEqual(['Amara', 'Priya'])
  })

  it('changes nothing when the file is malformed', () => {
    registerStudent('Ravi')
    const before = readLogbook()
    const result = applyRosterCsv('name\nAmara\nAmara\n')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/twice/)
    expect(readLogbook().roster).toEqual(before.roster)
  })

  it('upserts by studentId without wiping the rest of the class', () => {
    registerStudent('Ravi')
    const result = applyRosterCsv('studentId,name\nS-9,Amara\n')
    expect(result.ok).toBe(true)
    const names = readLogbook().roster.map((student) => student.name).sort()
    expect(names).toContain('Amara')
    expect(names).toContain('Ravi')
    expect(readLogbook().roster.find((student) => student.studentId === 'S-9')?.name).toBe(
      'Amara',
    )
  })
})
