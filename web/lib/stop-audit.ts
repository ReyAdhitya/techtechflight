import type { CommandRecord, LessonRecord } from '@/lib/logbook'
import { recordCommand } from '@/lib/logbook'

/**
 * Stop presses on the lesson record.
 *
 * Every emergency Stop the Teacher presses is written onto the running Lesson with
 * time and craft — the report afterwards must show what was cut, not invent it.
 *
 * ## Integrator API
 *
 * Call from the existing Stop command path (Control `issueCommand` when
 * `kind === 'emergency-stop'`), **instead of** a bare `recordCommand` for that press
 * — this helper already writes through `recordCommand` with kind `emergency-stop`:
 *
 * ```ts
 * if (kind === 'emergency-stop' && lesson) {
 *   recordStopOnLesson(lesson.id, { at: now, droneId, droneName: callsign })
 * } else if (lesson) {
 *   recordCommand(lesson.id, { at: now, droneId, droneName: callsign, kind })
 * }
 * ```
 *
 * Read back with `stopsOnLesson(lesson)` for Reports / lesson tools.
 */

/** Matches CommandKind `'emergency-stop'` — the word the Fleet already uses. */
export const STOP_COMMAND_KIND = 'emergency-stop'

export type StopPress = {
  readonly at: number
  readonly droneId: string
  /** Drone Name as said across the room — what the lesson record keeps. */
  readonly droneName: string
}

/** Write one Stop onto the lesson record (time + craft). */
export function recordStopOnLesson(lessonId: string, press: StopPress): void {
  const command: CommandRecord = {
    at: press.at,
    droneId: press.droneId,
    droneName: press.droneName,
    kind: STOP_COMMAND_KIND,
  }
  recordCommand(lessonId, command)
}

/** Every Stop written on this lesson, in the order they were recorded. */
export function stopsOnLesson(lesson: LessonRecord): readonly StopPress[] {
  return (lesson.commands ?? [])
    .filter((command) => command.kind === STOP_COMMAND_KIND)
    .map((command) => ({
      at: command.at,
      droneId: command.droneId,
      droneName: command.droneName,
    }))
}
