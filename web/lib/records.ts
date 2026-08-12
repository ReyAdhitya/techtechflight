import type { Logbook, LessonRecord } from './logbook.ts'
import type { AttendanceSession } from './attendance-history.ts'
import { attendanceCountsByStudent } from './attendance-history.ts'
import type { PupilFlightLessonSeal } from './pupil-flight-hours.ts'
import { pupilAirborneMs } from './pupil-flight-hours.ts'
import type { PupilNotesMap } from './pupil-notes.ts'
import { pupilNoteOf } from './pupil-notes.ts'

/**
 * The two questions Records answers, and no more (ADR-0035).
 *
 * **Who is in this class and how are they doing**, and **what has this one child done**. Every
 * figure is derived here, in this browser, from the records this browser already holds; the
 * database is a copy and no screen waits on it.
 *
 * Assembled from the four places the answer actually lives rather than from one invented
 * shape. The Logbook holds the roll and the lessons; attendance seals, pupil flight-hour seals
 * and pupil notes are each their own key and are not the Logbook — folding them into it needs
 * an ADR, and this screen is not that ADR.
 *
 * **Nothing live.** No altitude, no battery, no position: those are what is happening, and
 * these are what happened.
 */

export interface RecordsSources {
  readonly book: Logbook
  readonly attendance: readonly AttendanceSession[]
  readonly flightSeals: readonly PupilFlightLessonSeal[]
  readonly notes: PupilNotesMap
}

export interface ChildRow {
  readonly studentId: string
  readonly name: string
  /** Sealed lessons this child was in the room for. */
  readonly present: number
  /** Sealed lessons they were marked away from. */
  readonly absent: number
  /** Total time off the ground, in milliseconds, across every sealed lesson. */
  readonly airborneMs: number
  /** The Teacher's own words, or null. */
  readonly note: string | null
}

export interface ChildLesson {
  readonly lessonId: string
  readonly label: string
  readonly startedAt: number
  /** Null on a lesson whose attendance was never sealed — absence of a mark, not a mark. */
  readonly present: boolean | null
  readonly airborneMs: number
}

/** Everyone on the roll, alphabetical. The class list, and the first of the two questions. */
export function classList(sources: RecordsSources): readonly ChildRow[] {
  const roster = sources.book.roster ?? []
  const counted = attendanceCountsByStudent(sources.attendance, roster)

  return [...counted]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((student) => ({
      studentId: student.studentId,
      name: student.name,
      present: student.counts.present,
      absent: student.counts.absent,
      /*
       * `pupilAirborneMs` resolves a child's aliases itself — seals written before the roster
       * existed are keyed by display name, and a child's hours vanishing because the product
       * grew an id is the kind of loss a Teacher notices and cannot explain.
       */
      airborneMs: pupilAirborneMs(sources.book, student.studentId, sources.flightSeals)
        .airborneMs,
      note: pupilNoteOf(sources.notes, student.studentId)?.text ?? null,
    }))
}

/** One child, lesson by lesson, newest first. The second question, and the whole of it. */
export function childHistory(
  sources: RecordsSources,
  studentId: string,
): readonly ChildLesson[] {
  const name = nameOf(sources.book, studentId)
  return [...(sources.book.lessons ?? [])]
    .sort((a, b) => b.startedAt - a.startedAt)
    .map((lesson) => lessonRowFor(sources, lesson, studentId, name))
    .filter((row): row is ChildLesson => row !== null)
}

function lessonRowFor(
  sources: RecordsSources,
  lesson: LessonRecord,
  studentId: string,
  name: string,
): ChildLesson | null {
  const sealed = sources.attendance.find((row) => row.lessonId === lesson.id) ?? null
  const airborneMs = airborneIn(sources.flightSeals, lesson.id, studentId, name)

  const markedPresent = sealed?.presentStudentIds.includes(studentId) ?? false
  const markedAbsent = sealed?.absentStudentIds.includes(studentId) ?? false

  /*
   * A row belongs to this child when a Teacher marked them either way, or when they flew.
   *
   * The seal *existing* is not enough — it is one lesson's mark for the whole class, and a
   * child who was not on that roll at all would otherwise get a row for a morning they had
   * nothing to do with. An **absent** mark is a row, because a Teacher reading a record needs
   * the gaps as much as the flights.
   */
  if (!markedPresent && !markedAbsent && airborneMs === 0) return null

  const present = markedPresent ? true : markedAbsent ? false : null

  return {
    lessonId: lesson.id,
    label: lesson.label,
    startedAt: lesson.startedAt,
    present,
    airborneMs,
  }
}

function airborneIn(
  seals: readonly PupilFlightLessonSeal[],
  lessonId: string,
  studentId: string,
  name: string,
): number {
  const seal = seals.find((row) => row.lessonId === lessonId)
  if (!seal) return 0
  return seal.airborneMsByStudent[studentId] ?? seal.airborneMsByStudent[name] ?? 0
}

function nameOf(book: Logbook, studentId: string): string {
  return (book.roster ?? []).find((row) => row.studentId === studentId)?.name ?? studentId
}
