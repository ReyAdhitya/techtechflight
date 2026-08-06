import { beforeEach, describe, expect, it } from 'vitest'
import {
  ATTENDANCE_HISTORY_KEY,
  attendanceCountsByStudent,
  attendanceCountsFor,
  attendanceSnapshotFromBook,
  clearAttendanceHistory,
  formatAttendanceCounts,
  readAttendanceHistory,
  sealAttendance,
  sealAttendanceFromBook,
} from './attendance-history'
import {
  clearLogbook,
  readLogbook,
  registerStudent,
  setStudentAbsent,
  type Logbook,
} from './logbook'

beforeEach(() => {
  clearLogbook()
  clearAttendanceHistory()
})

function aBook(partial: Partial<Logbook> = {}): Logbook {
  return {
    notes: {},
    service: {},
    lessons: [],
    students: {},
    roll: [],
    roster: [],
    trainerDrones: [],
    trainerLessons: [],
    lessonDrones: [],
    lessonAssignments: [],
    ...partial,
  }
}

describe('attendance snapshot from the Logbook', () => {
  it('splits the roster into present and absent from marks already kept', () => {
    const amara = registerStudent('Amara')
    const priya = registerStudent('Priya')
    if (!amara || !priya) throw new Error('expected ids')
    setStudentAbsent(priya, true)

    const snap = attendanceSnapshotFromBook(readLogbook())
    expect(snap.presentStudentIds).toEqual([amara])
    expect(snap.absentStudentIds).toEqual([priya])
  })

  it('treats an empty absent list as everyone present', () => {
    const id = registerStudent('Ravi')
    if (!id) throw new Error('expected id')
    const snap = attendanceSnapshotFromBook(readLogbook())
    expect(snap.presentStudentIds).toEqual([id])
    expect(snap.absentStudentIds).toEqual([])
  })
})

describe('sealing attendance over time', () => {
  it('stores a session and tallies present and absent per pupil', () => {
    sealAttendance({
      lessonId: 'lesson-1',
      at: 1_000,
      presentStudentIds: ['S-0001', 'S-0002'],
      absentStudentIds: ['S-0003'],
    })
    sealAttendance({
      lessonId: 'lesson-2',
      at: 2_000,
      presentStudentIds: ['S-0001'],
      absentStudentIds: ['S-0002', 'S-0003'],
    })

    const history = readAttendanceHistory()
    expect(history).toHaveLength(2)
    expect(attendanceCountsFor(history, 'S-0001')).toEqual({ present: 2, absent: 0 })
    expect(attendanceCountsFor(history, 'S-0002')).toEqual({ present: 1, absent: 1 })
    expect(attendanceCountsFor(history, 'S-0003')).toEqual({ present: 0, absent: 2 })
  })

  it('replaces a prior seal for the same Lesson rather than double-counting', () => {
    sealAttendance({
      lessonId: 'lesson-1',
      at: 1_000,
      presentStudentIds: ['S-0001'],
      absentStudentIds: [],
    })
    sealAttendance({
      lessonId: 'lesson-1',
      at: 1_500,
      presentStudentIds: [],
      absentStudentIds: ['S-0001'],
    })

    expect(readAttendanceHistory()).toHaveLength(1)
    expect(attendanceCountsFor(readAttendanceHistory(), 'S-0001')).toEqual({
      present: 0,
      absent: 1,
    })
  })

  it('seals from the open Logbook marks', () => {
    const id = registerStudent('Amara')
    if (!id) throw new Error('expected id')
    setStudentAbsent(id, true)
    sealAttendanceFromBook('lesson-9', readLogbook(), 9_000)

    expect(attendanceCountsFor(readAttendanceHistory(), id)).toEqual({
      present: 0,
      absent: 1,
    })
    expect(window.localStorage.getItem(ATTENDANCE_HISTORY_KEY)).toContain('lesson-9')
  })

  it('renders zero when nothing has been sealed yet', () => {
    expect(attendanceCountsFor([], 'S-0001')).toEqual({ present: 0, absent: 0 })
    expect(formatAttendanceCounts({ present: 0, absent: 0 })).toBe('Present 0, Absent 0')
  })
})

describe('roster order', () => {
  it('keeps roster order when attaching counts', () => {
    const rows = attendanceCountsByStudent(
      [
        {
          lessonId: 'l1',
          at: 1,
          presentStudentIds: ['b'],
          absentStudentIds: ['a'],
        },
      ],
      [
        { studentId: 'a', name: 'Amara' },
        { studentId: 'b', name: 'Priya' },
      ],
    )
    expect(rows.map((row) => row.studentId)).toEqual(['a', 'b'])
    expect(rows[0]?.counts).toEqual({ present: 0, absent: 1 })
    expect(rows[1]?.counts).toEqual({ present: 1, absent: 0 })
  })

  it('ignores a fabricated book shape with no roster', () => {
    expect(attendanceSnapshotFromBook(aBook()).presentStudentIds).toEqual([])
  })
})
