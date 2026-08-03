import {
  isStudentAbsent,
  studentByName,
  unassignedRosterNames,
  type Logbook,
} from './logbook'

/**
 * Who flies next — Students on the roll with no Drone yet, still in the room.
 *
 * Order is roster / roll order and never reshuffles when someone else gets a craft
 * (DELIBERATE-POSITIONS 1). Absent Students stay off this list; Feature 30 hands their
 * freed craft to whoever is already waiting.
 */
export function waitingListNames(book: Logbook): readonly string[] {
  return unassignedRosterNames(book).filter((name) => {
    const student = studentByName(book, name)
    if (!student) return true
    return !isStudentAbsent(book, student.studentId)
  })
}

/** Empty copy — the list vanishing would look like a layout bug, not information. */
export const WAITING_LIST_EMPTY =
  'Nobody is waiting. Every Student on the roll has a Drone, or the roll is empty.'
