import type { ClassroomSeat, ClassroomSession } from './classroom-session.ts'
import { allPointsReached, seatHasFlown } from './classroom-session.ts'

/**
 * The twelve steps of a lesson, as a Student sees them, and which one they are on.
 *
 * ADR-0028. These are not the Teacher's twelve: the Teacher's are the work of running a
 * class, these are what happens to a child in it. They are a lesson plan rather than a
 * phase counter, which is why ADR-0025's "no phase counter" was amended rather than broken,
 * and **nothing here is pressable**. A Student never chooses what happens next.
 *
 * Which step they are on is read from records and Telemetry, never from a press. Two things
 * in the whole app can be pressed and neither of them moves a Student on: asking is
 * answered by the Teacher, and Understood is an acknowledgement.
 */

export const STUDENT_STEPS = [
  'Briefing',
  'Rules and time',
  'Prepare',
  'Connect',
  'Ask to take off',
  'Take off',
  'Fly the points',
  'Stay out of red',
  'Teacher says',
  'Task done',
  'Land',
  'Score',
] as const

export const STUDENT_STEP_COUNT = STUDENT_STEPS.length

/** What the tablet is being told right now, beyond what the seat records. */
export interface StudentNow {
  /** The Drone is off the ground this instant, from Telemetry. */
  readonly airborne: boolean
  /** It is inside a No-fly Zone this instant, from Telemetry. */
  readonly inNoFlyZone: boolean
  /** An instruction has arrived and has not been acknowledged. */
  readonly instructionWaiting: boolean
}

/**
 * Which of the twelve a Student is on, 1 to 12.
 *
 * Later wins over earlier, the same ladder the Teacher's rail uses: a sealed score is step
 * 12 however much of the middle was skipped. The two that jump the queue are the two that
 * take the whole screen when they happen, a red zone and a Teacher's instruction, because
 * the rail has to agree with what the Student is actually looking at.
 */
export function studentStep(
  seat: ClassroomSeat,
  session: ClassroomSession,
  now: StudentNow,
): number {
  /*
   * Score is step 12 only once there is one. A seat that is down and complete but whose
   * Teacher has not sealed the Mission is still at Land, because the screen it is looking
   * at says "you are down, wait", and a rail reading Score beside that is a rail
   * contradicting the stage.
   */
  if (seat.score !== null || session.outcome != null) return 12
  if (seat.phase === 'returning' || seat.phase === 'complete') return 11

  if (now.airborne) {
    if (now.inNoFlyZone) return 8
    if (now.instructionWaiting) return 9
    if (allPointsReached(seat, session.checkpoints ?? [])) return 10
    return 7
  }

  // Down again after flying, and the Teacher has not approved: still the flying half.
  if (seatHasFlown(seat)) return 7

  if (seat.phase === 'cleared') return 6
  if (seat.phase === 'awaiting-clearance' || seat.phase === 'held') return 5
  if (seat.droneId !== null) return 4
  if (session.live) return 2
  return 1
}

/** How a rail row reads: behind them, where they are, or still to come. */
export type StudentStepState = 'done' | 'now' | 'ahead'

export function studentStepState(step: number, current: number): StudentStepState {
  if (step === current) return 'now'
  return step < current ? 'done' : 'ahead'
}

/**
 * How many points are still to reach, or null when the Mission asks for none.
 *
 * Null rather than zero: a Mission with no points is not a Mission with none left, and the
 * flying screen has to say the difference rather than lead with a nought.
 */
export function pointsLeft(seat: ClassroomSeat, session: ClassroomSession): number | null {
  const required = (session.checkpoints ?? []).filter((point) => point.required)
  if (required.length === 0) return null
  const reached = required.filter((point) => seat.reachedCheckpointIds.includes(point.id))
  return required.length - reached.length
}
