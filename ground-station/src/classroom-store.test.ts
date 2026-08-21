import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  mergeClassrooms,
  readClassroom,
  writeClassroom,
  type ClassroomDoc,
} from './classroom-store.ts'

/**
 * The classroom, on the laptop.
 *
 * Two things are worth pinning and they are the two that cost a week elsewhere. The merge must
 * settle a seat on `rev` and never on a clock, because a board and a tablet do not share one.
 * And it must reach the disk on every write, because a crash mid-lesson must not lose who is on
 * which Drone.
 */

let dir: string
let path: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ttf-classroom-'))
  path = join(dir, 'classrooms.json')
})

afterEach(() => rmSync(dir, { recursive: true, force: true }))

const seat = (over: { studentId: string; rev?: number; droneId?: string | null }) => ({
  studentId: over.studentId,
  name: over.studentId,
  droneId: over.droneId ?? null,
  joinedAt: 1_000,
  seenAt: 1_000,
  rev: over.rev ?? 0,
})

const room = (over: Partial<ClassroomDoc> = {}): ClassroomDoc => ({
  code: 'K7M2',
  rev: 0,
  updatedAt: 1_000,
  seats: [],
  ...over,
})

describe('a classroom on the laptop', () => {
  it('gives back nothing for a code nobody has written', () => {
    expect(readClassroom('K7M2', path)).toBeNull()
  })

  it('persists on the write, so a crash mid-lesson keeps who is on which Drone', () => {
    writeClassroom(room({ seats: [seat({ studentId: 'stu-kntl', droneId: 'ttf-0001' })] }), path)

    /* Read from the file rather than from memory: the process is meant to be able to die. */
    const onDisk = JSON.parse(readFileSync(path, 'utf8')) as Record<string, ClassroomDoc>
    expect(onDisk['K7M2']?.seats?.[0]?.droneId).toBe('ttf-0001')
  })

  it('normalises the code, so k7m2 and K7M2 are one room', () => {
    writeClassroom(room({ code: 'k7m2' }), path)

    expect(readClassroom('K7M2', path)).not.toBeNull()
  })

  it('keeps rooms apart', () => {
    writeClassroom(room({ code: 'AAAA' }), path)
    writeClassroom(room({ code: 'BBBB' }), path)

    expect(readClassroom('AAAA', path)?.code).toBe('AAAA')
    expect(readClassroom('BBBB', path)?.code).toBe('BBBB')
  })

  /* A half-written file is not worth a lesson. Start again rather than refuse to run. */
  it('survives a corrupt file rather than refusing to open', () => {
    writeFileSync(path, '{ this is not json', 'utf8')

    expect(readClassroom('K7M2', path)).toBeNull()
    expect(() => writeClassroom(room(), path)).not.toThrow()
  })
})

describe('the merge, which is the Worker rule ported', () => {
  /* The board's next heartbeat must not erase a child who has just taken a Drone. */
  it('keeps a seat the other copy has never heard of', () => {
    const tablet = room({ rev: 1, seats: [seat({ studentId: 'stu-kntl', rev: 2 })] })
    const boardHeartbeat = room({ rev: 2, seats: [] })

    const merged = mergeClassrooms(boardHeartbeat, tablet)

    expect(merged.seats?.map((s) => s.studentId)).toEqual(['stu-kntl'])
  })

  it('settles one seat on rev, not on the document clock', () => {
    const stale = room({
      updatedAt: 9_999,
      seats: [seat({ studentId: 'stu-kntl', droneId: null, rev: 1 })],
    })
    const fresh = room({
      updatedAt: 1,
      seats: [seat({ studentId: 'stu-kntl', droneId: 'ttf-0001', rev: 7 })],
    })

    expect(mergeClassrooms(stale, fresh).seats?.[0]?.droneId).toBe('ttf-0001')
  })

  /* A Teacher taking a child off a craft must not be undone by that tablet's next write. */
  it('honours a freed seat from either copy', () => {
    const tablet = room({ seats: [seat({ studentId: 'stu-kntl', rev: 5 })] })
    const board = room({ rev: 1, seats: [], removedSeatIds: ['stu-kntl'] })

    expect(mergeClassrooms(tablet, board).seats).toEqual([])
  })

  it('takes the room from the higher rev and keeps both seats', () => {
    const tablet = room({ rev: 1, seats: [seat({ studentId: 'stu-a' })] })
    const board = room({ rev: 4, lessonLabel: 'Year 8', seats: [seat({ studentId: 'stu-b' })] })

    const merged = mergeClassrooms(tablet, board)

    expect(merged['lessonLabel']).toBe('Year 8')
    expect(merged.seats?.map((s) => s.studentId).sort()).toEqual(['stu-a', 'stu-b'])
  })

  it('does not merge two different rooms', () => {
    const mine = room({ code: 'AAAA' })
    const theirs = room({ code: 'BBBB', rev: 99 })

    expect(mergeClassrooms(mine, theirs).code).toBe('AAAA')
  })

  /* Written twice and merged twice must equal written once. */
  it('is stable when the same document arrives again', () => {
    const one = room({ rev: 3, seats: [seat({ studentId: 'stu-kntl', rev: 2 })] })

    const merged = mergeClassrooms(one, mergeClassrooms(one, one))

    expect(merged.seats).toHaveLength(1)
    expect(merged.rev).toBe(3)
  })
})
