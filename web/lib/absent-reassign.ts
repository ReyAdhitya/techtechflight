import type { DroneId } from '@techtechflight/contract'
import {
  assignStudent,
  isStudentAbsent,
  readLogbook,
  setStudentAbsent,
  studentByName,
  studentIdOf,
  studentOf,
  studentRecordOf,
  unassignedRosterNames,
} from './logbook'

/** What marking a Student absent did to the live assignment map. */
export interface AbsentReassignResult {
  readonly studentId: string
  readonly studentName: string
  /** Craft freed back to the waiting list, or null when they were not flying. */
  readonly freedDroneId: DroneId | null
  /** Next present roster name waiting for a craft, or null when nobody is waiting. */
  readonly nextWaitingName: string | null
}

/**
 * Mark a Student absent, free their craft, and say who is next on the waiting list.
 *
 * The craft returns to the pool of free Drones; it is not auto-handed to the next name —
 * that stays a Teacher choice. Absent roster members are skipped when naming who is next.
 */
export function markAbsentAndFreeCraft(studentId: string): AbsentReassignResult | null {
  const book = readLogbook()
  const student = studentRecordOf(book, studentId)
  if (!student) return null

  let freedDroneId: DroneId | null = null
  for (const droneId of Object.keys(book.students) as DroneId[]) {
    if (studentIdOf(book, droneId) === studentId) {
      freedDroneId = droneId
      break
    }
    if (studentOf(book, droneId) === student.name) {
      freedDroneId = droneId
      break
    }
  }

  if (freedDroneId !== null) {
    assignStudent(freedDroneId, '')
  }
  setStudentAbsent(studentId, true)

  return {
    studentId,
    studentName: student.name,
    freedDroneId,
    nextWaitingName: nextPresentWaitingName(),
  }
}

/** Next unassigned roster name who is not marked absent. */
export function nextPresentWaitingName(): string | null {
  const book = readLogbook()
  for (const name of unassignedRosterNames(book)) {
    const student = studentByName(book, name)
    if (student !== null && isStudentAbsent(book, student.studentId)) continue
    return name
  }
  return null
}
