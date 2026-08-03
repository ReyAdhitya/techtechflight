import { describe, expect, it } from 'vitest'
import type { LessonRecord } from './logbook'
import { exerciseRemaining, formatExerciseRemaining } from './exercise-remaining'

function lesson(
  partial: Partial<LessonRecord> & Pick<LessonRecord, 'exercises'>,
): LessonRecord {
  return {
    id: 'L-1',
    label: 'Hover',
    startedAt: 1_000_000,
    endedAt: null,
    readyAtStart: 4,
    fleetSize: 6,
    incidents: [],
    ...partial,
  }
}

describe('exerciseRemaining', () => {
  it('counts down the current Exercise while its duration still has time left', () => {
    const result = exerciseRemaining(
      lesson({
        exercises: [
          { id: 'e1', name: 'Hover', minutes: 5 },
          { id: 'e2', name: 'Square', minutes: 10 },
        ],
      }),
      1_000_000 + 2 * 60_000,
    )
    expect(result).toMatchObject({
      exercise: { id: 'e1', name: 'Hover', minutes: 5 },
      position: 1,
      of: 2,
      remainingMs: 3 * 60_000,
    })
  })

  it('advances into the next Exercise once the prior duration is spent', () => {
    const result = exerciseRemaining(
      lesson({
        exercises: [
          { id: 'e1', name: 'Hover', minutes: 5 },
          { id: 'e2', name: 'Square', minutes: 10 },
        ],
      }),
      1_000_000 + 6 * 60_000,
    )
    expect(result?.exercise.name).toBe('Square')
    expect(result?.remainingMs).toBe(9 * 60_000)
  })

  it('is silent when the current Exercise has no duration set', () => {
    expect(
      exerciseRemaining(
        lesson({
          exercises: [{ id: 'e1', name: 'Free fly' }],
        }),
        1_000_000 + 30_000,
      ),
    ).toBeNull()
  })

  it('is silent past the end of the plan, and with no Exercises at all', () => {
    expect(
      exerciseRemaining(
        lesson({
          exercises: [{ id: 'e1', name: 'Hover', minutes: 5 }],
        }),
        1_000_000 + 10 * 60_000,
      ),
    ).toBeNull()
    expect(exerciseRemaining(lesson({ exercises: [] }), 1_000_000)).toBeNull()
  })
})

describe('formatExerciseRemaining', () => {
  it('reads as m:ss left, matching the Lesson elapsed clock', () => {
    expect(formatExerciseRemaining(3 * 60_000 + 12_000)).toBe('3:12 left')
    expect(formatExerciseRemaining(45_000)).toBe('0:45 left')
    expect(formatExerciseRemaining(0)).toBe('0:00 left')
  })
})
