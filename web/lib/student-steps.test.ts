import { describe, expect, it } from 'vitest'
import type { ClassroomSeat, ClassroomSession } from './classroom-session'
import type { MissionCheckpoint } from './mission'
import {
  STUDENT_STEPS,
  pointsLeft,
  studentStep,
  studentStepState,
  type StudentNow,
} from './student-steps'

/**
 * Which of the twelve a Student is on, and where that answer comes from.
 *
 * Never from a press. Two things in the whole app are pressable and neither moves a Student
 * on: asking is answered by the Teacher, Understood is an acknowledgement. Everything here
 * reads a record or a Telemetry frame.
 */

const point = (id: string, required = true): MissionCheckpoint => ({
  id,
  name: id,
  at: { eastM: 0, northM: 0 },
  radiusM: 1,
  required,
})

const seat = (over: Partial<ClassroomSeat> = {}): ClassroomSeat => ({
  studentId: 'stu-ada',
  name: 'Ada',
  droneId: 'ttf-0001',
  droneName: 'Drone 1',
  phase: 'briefing',
  takeoffRequestedAt: null,
  clearedAt: null,
  heldAt: null,
  flownAt: null,
  reachedCheckpointIds: [],
  approvedAt: null,
  score: null,
  joinedAt: 0,
  ...over,
})

const session = (over: Partial<ClassroomSession> = {}): ClassroomSession =>
  ({
    code: 'ABCD',
    openedAt: 0,
    updatedAt: 0,
    lessonId: 'lesson-1',
    lessonLabel: 'Year 8',
    scenarioId: 'search-rescue',
    scenarioName: 'Search and Rescue',
    objective: 'Find it.',
    rules: [],
    limitMinutes: 8,
    checkpointCount: 3,
    checkpoints: [point('a'), point('b'), point('c')],
    zones: [],
    seats: [],
    instructions: [],
    live: true,
    ...over,
  }) as ClassroomSession

const still: StudentNow = { airborne: false, inNoFlyZone: false, instructionWaiting: false }
const flying: StudentNow = { airborne: true, inNoFlyZone: false, instructionWaiting: false }

describe('the twelve a Student sees', () => {
  it('is a lesson plan rather than a phase counter', () => {
    expect(STUDENT_STEPS).toHaveLength(12)
    expect(STUDENT_STEPS[0]).toBe('Briefing')
    expect(STUDENT_STEPS[6]).toBe('Fly the points')
    expect(STUDENT_STEPS[11]).toBe('Score')
  })

  it('marks one row now, everything before it done and everything after it ahead', () => {
    expect(studentStepState(6, 7)).toBe('done')
    expect(studentStepState(7, 7)).toBe('now')
    expect(studentStepState(8, 7)).toBe('ahead')
  })
})

describe('which step a Student is on', () => {
  it('walks the ground half from the records, never from a press', () => {
    expect(studentStep(seat({ droneId: null }), session({ live: false }), still)).toBe(1)
    expect(studentStep(seat({ droneId: null }), session(), still)).toBe(2)
    expect(studentStep(seat(), session(), still)).toBe(4)
    expect(studentStep(seat({ phase: 'awaiting-clearance' }), session(), still)).toBe(5)
    expect(studentStep(seat({ phase: 'held' }), session(), still)).toBe(5)
    expect(studentStep(seat({ phase: 'cleared' }), session(), still)).toBe(6)
  })

  it('is flying the points the moment Telemetry says it is off the ground', () => {
    expect(studentStep(seat({ phase: 'cleared', flownAt: 1 }), session(), flying)).toBe(7)
  })

  /*
   * The two that take the whole screen also take the rail, or the rail disagrees with what
   * the Student is looking at.
   */
  it('follows the screen into a red zone and an instruction', () => {
    const up = seat({ phase: 'flying', flownAt: 1 })
    expect(studentStep(up, session(), { ...flying, inNoFlyZone: true })).toBe(8)
    expect(studentStep(up, session(), { ...flying, instructionWaiting: true })).toBe(9)
  })

  it('reaches Task done only when every required point is reached', () => {
    const two = seat({ phase: 'flying', flownAt: 1, reachedCheckpointIds: ['a', 'b'] })
    expect(studentStep(two, session(), flying)).toBe(7)

    const all = seat({ phase: 'flying', flownAt: 1, reachedCheckpointIds: ['a', 'b', 'c'] })
    expect(studentStep(all, session(), flying)).toBe(10)
  })

  it('lands after the Teacher approves, and scores once the Drone is down', () => {
    const approved = seat({ phase: 'returning', flownAt: 1, approvedAt: 2 })
    expect(studentStep(approved, session(), flying)).toBe(11)

    // Down and complete, but nobody has sealed a score: still Land, because that is what
    // the screen beside the rail says.
    const down = seat({ phase: 'complete', flownAt: 1, approvedAt: 2 })
    expect(studentStep(down, session(), still)).toBe(11)

    const scored = seat({ phase: 'complete', flownAt: 1, approvedAt: 2, score: 0.8 })
    expect(studentStep(scored, session(), still)).toBe(12)
  })
})

describe('how many points are left', () => {
  it('counts only the required ones, in any order', () => {
    const mixed = session({ checkpoints: [point('a'), point('b'), point('c', false)] })
    expect(pointsLeft(seat(), mixed)).toBe(2)
    expect(pointsLeft(seat({ reachedCheckpointIds: ['b'] }), mixed)).toBe(1)
    expect(pointsLeft(seat({ reachedCheckpointIds: ['b', 'a'] }), mixed)).toBe(0)
  })

  /* Null rather than zero: no points set is not the same as none left. */
  it('says nothing when the Mission asks for no points', () => {
    expect(pointsLeft(seat(), session({ checkpoints: [] }))).toBeNull()
  })
})
