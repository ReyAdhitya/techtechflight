import { describe, expect, it } from 'vitest'
import { readServerLogbook, type Logbook } from './logbook.ts'
import type { AttendanceSession } from './attendance-history.ts'
import type { PupilFlightLessonSeal } from './pupil-flight-hours.ts'
import { childHistory, classList, type RecordsSources } from './records.ts'

/**
 * The two questions Records answers.
 *
 * What is worth pinning is not the arithmetic. It is the three places this screen has to refuse
 * to guess: an unsealed Lesson is not attendance, a Lesson a child was not in is not their row,
 * and a child's hours must survive the roster growing ids.
 */

const lesson = (id: string, label: string, startedAt: number) => ({
  id,
  label,
  startedAt,
  endedAt: startedAt + 3_600_000,
  readyAtStart: 6,
  fleetSize: 6,
  incidents: [],
})

function sources(over: Partial<RecordsSources> = {}): RecordsSources {
  const book: Logbook = {
    ...readServerLogbook(),
    roster: [
      { studentId: 'stu-priya', name: 'Priya' },
      { studentId: 'stu-amara', name: 'Amara' },
    ],
    lessons: [lesson('L-1', 'Year 8, period 3', 1_000), lesson('L-2', 'Year 8, period 4', 2_000)],
    ...over.book,
  }
  return {
    book,
    attendance: over.attendance ?? [],
    flightSeals: over.flightSeals ?? [],
    notes: over.notes ?? {},
  }
}

const sealed = (
  lessonId: string,
  present: readonly string[],
  absent: readonly string[],
): AttendanceSession => ({
  lessonId,
  at: 5_000,
  presentStudentIds: present,
  absentStudentIds: absent,
})

const flew = (lessonId: string, byStudent: Record<string, number>): PupilFlightLessonSeal => ({
  lessonId,
  airborneMsByStudent: byStudent,
})

describe('the class list', () => {
  it('lists everyone on the roll, alphabetically', () => {
    expect(classList(sources()).map((row) => row.name)).toEqual(['Amara', 'Priya'])
  })

  /*
   * A Lesson nobody sealed is not a Lesson everybody attended. Counting it would put a number
   * on this screen that no Teacher entered, which is the one thing a record must not do.
   */
  it('counts sealed Lessons only', () => {
    const rows = classList(sources({ attendance: [sealed('L-1', ['stu-priya'], ['stu-amara'])] }))

    expect(rows.find((row) => row.name === 'Priya')?.present).toBe(1)
    expect(rows.find((row) => row.name === 'Amara')?.absent).toBe(1)
    expect(rows.find((row) => row.name === 'Amara')?.present).toBe(0)
  })

  /* Seals written before the roster grew ids are keyed by name, and those hours still count. */
  it('finds a child’s hours whether the seal is keyed by id or by name', () => {
    const rows = classList(
      sources({
        flightSeals: [flew('L-1', { 'stu-priya': 60_000 }), flew('L-2', { Priya: 30_000 })],
      }),
    )

    const priya = rows.find((row) => row.name === 'Priya')
    expect(priya?.airborneMs).toBe(90_000)
    expect(priya?.flights).toBe(2)
  })

  it('carries the Teacher’s own words when there are any', () => {
    const rows = classList(
      sources({ notes: { 'stu-priya': { text: 'Flies wide on the turn.', updatedAt: 1 } } }),
    )

    expect(rows.find((row) => row.name === 'Priya')?.note).toBe('Flies wide on the turn.')
    expect(rows.find((row) => row.name === 'Amara')?.note).toBeNull()
  })
})

describe('one child’s history', () => {
  it('shows the Lessons they were in, newest first', () => {
    const rows = childHistory(
      sources({ attendance: [sealed('L-1', ['stu-priya'], []), sealed('L-2', ['stu-priya'], [])] }),
      'stu-priya',
    )

    expect(rows.map((row) => row.lessonId)).toEqual(['L-2', 'L-1'])
  })

  /* A morning they were not in is not a row. Padding a record with blanks is not a record. */
  it('leaves out a Lesson the child had nothing to do with', () => {
    const rows = childHistory(
      sources({ attendance: [sealed('L-1', ['stu-amara'], [])] }),
      'stu-priya',
    )

    expect(rows).toHaveLength(0)
  })

  /* An absence is a row, because a Teacher needs the gaps as much as the flights. */
  it('keeps a Lesson the child was marked away from', () => {
    const rows = childHistory(sources({ attendance: [sealed('L-1', [], ['stu-priya'])] }), 'stu-priya')

    expect(rows).toHaveLength(1)
    expect(rows[0]?.present).toBe(false)
  })

  /*
   * Null, not false. An unsealed Lesson is one nobody answered for, and printing "Absent" where
   * a Teacher's mark belongs invents a mark.
   */
  it('says nothing about attendance on a Lesson nobody sealed', () => {
    const rows = childHistory(
      sources({ flightSeals: [flew('L-1', { 'stu-priya': 45_000 })] }),
      'stu-priya',
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]?.present).toBeNull()
    expect(rows[0]?.airborneMs).toBe(45_000)
  })
})
