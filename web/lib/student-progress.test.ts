import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  allPointsReached,
  approveSeatTask,
  assignSeatCraft,
  joinClassroomAsStudent,
  markPointsReached,
  markSeatComplete,
  markSeatFlown,
  openClassroom,
  pointsReachedAt,
  readClassroomSession,
  resetClassroomForTests,
  type ClassroomSession,
} from './classroom-session'
import type { MissionCheckpoint } from './mission'

/**
 * The hole this closes: nothing advanced a Student past takeoff.
 *
 * `checkpointIndex` was set to nought and never incremented, and the `'returning'` and
 * `'complete'` phases were never set by anything, so twelve screens existed and five could
 * be reached. A Student took off and their tablet never changed again.
 *
 * Points tick off from the Drone's own position, in any order, so nobody can claim one they
 * did not fly to. Approval is the Teacher's single tap and cannot come before every point.
 * Down after approval is Telemetry, never a press.
 */

const point = (id: string, eastM: number, northM: number): MissionCheckpoint => ({
  id,
  name: id,
  at: { eastM, northM },
  radiusM: 1.5,
  required: true,
})

const POINTS = [point('near', 0, 0), point('far', 10, 0), point('corner', 10, 10)]

function classroomWithAda(): ClassroomSession {
  const opened = openClassroom({
    lessonId: 'lesson-1',
    lessonLabel: 'Year 8',
    scenarioId: 'search-rescue',
    scenarioName: 'Search and Rescue',
    objective: 'Find it.',
    rules: [],
    limitMinutes: 8,
    zones: [],
    checkpoints: POINTS,
    live: true,
    now: 1_000,
  })
  const joined = joinClassroomAsStudent(opened, 'Ada', 2_000, 'stu-ada')
  return assignSeatCraft(joined.session, 'stu-ada', 'ttf-0001', 'Drone 1')
}

const seatOf = (session: ClassroomSession) => session.seats[0]!

beforeEach(() => resetClassroomForTests())
afterEach(() => resetClassroomForTests())

describe('a point ticking off by itself', () => {
  it('reads the Drone position rather than anything a Student pressed', () => {
    expect(pointsReachedAt(POINTS, { eastM: 0.5, northM: 0.5 })).toEqual(['near'])
    expect(pointsReachedAt(POINTS, { eastM: 5, northM: 5 })).toEqual([])
  })

  /* No position, no claim. An airframe that cannot say where it is cannot be scored. */
  it('claims nothing for a Drone that is not reporting a position', () => {
    expect(pointsReachedAt(POINTS, null)).toEqual([])
  })

  it('counts them in whatever order the Drone flew them', () => {
    let session = classroomWithAda()
    session = markPointsReached(session, 'ttf-0001', ['corner'])
    session = markPointsReached(session, 'ttf-0001', ['near'])

    expect(seatOf(session).reachedCheckpointIds).toEqual(['corner', 'near'])
  })

  it('does not tick the same point twice, or write when nothing is new', () => {
    let session = classroomWithAda()
    session = markPointsReached(session, 'ttf-0001', ['near'])
    const after = markPointsReached(session, 'ttf-0001', ['near'])

    expect(after).toBe(session)
    expect(seatOf(after).reachedCheckpointIds).toEqual(['near'])
  })

  it('ticks the Drone that flew there, and no other', () => {
    let session = classroomWithAda()
    session = markPointsReached(session, 'ttf-0002', ['near'])

    expect(seatOf(session).reachedCheckpointIds).toEqual([])
  })
})

describe('the Teacher approving a finished task', () => {
  it('refuses while a single point is still outstanding', () => {
    let session = classroomWithAda()
    session = markPointsReached(session, 'ttf-0001', ['near', 'far'])

    expect(allPointsReached(seatOf(session), POINTS)).toBe(false)

    const attempted = approveSeatTask(session, 'stu-ada', POINTS)
    expect(attempted).toBe(session)
    expect(seatOf(attempted).phase).not.toBe('returning')
  })

  it('starts the way down once every point is reached', () => {
    let session = classroomWithAda()
    session = markPointsReached(session, 'ttf-0001', ['near', 'far', 'corner'])

    expect(allPointsReached(seatOf(session), POINTS)).toBe(true)

    session = approveSeatTask(session, 'stu-ada', POINTS, 5_000)
    expect(seatOf(session).phase).toBe('returning')
    expect(seatOf(session).approvedAt).toBe(5_000)
  })

  /* A Mission with no points to reach is not a finished one. */
  it('is not offered for a Mission that asks for no points', () => {
    const session = classroomWithAda()
    expect(allPointsReached(seatOf(session), [])).toBe(false)
  })
})

describe('the Mission ending for a seat', () => {
  it('completes when Telemetry sees it down after an approval', () => {
    let session = classroomWithAda()
    session = markSeatFlown(session, 'stu-ada', 3_000)
    session = markPointsReached(session, 'ttf-0001', ['near', 'far', 'corner'])
    session = approveSeatTask(session, 'stu-ada', POINTS, 5_000)

    session = markSeatComplete(session, 'stu-ada', 6_000)
    expect(seatOf(session).phase).toBe('complete')
    expect(seatOf(readClassroomSession()!).phase).toBe('complete')
  })

  /* A Drone that touches down mid-Mission has landed, not finished. */
  it('does not complete a seat the Teacher has not approved', () => {
    let session = classroomWithAda()
    session = markSeatFlown(session, 'stu-ada', 3_000)

    const attempted = markSeatComplete(session, 'stu-ada', 4_000)
    expect(attempted).toBe(session)
    expect(seatOf(attempted).phase).toBe('flying')
  })
})
