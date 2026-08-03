import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { LessonRecord } from '@/lib/logbook'
import { ExerciseRemaining } from './ExerciseRemaining'

const startedAt = 1_000_000

function lesson(exercises: LessonRecord['exercises']): LessonRecord {
  return {
    id: 'L-1',
    label: 'Hover',
    startedAt,
    endedAt: null,
    readyAtStart: 4,
    fleetSize: 6,
    incidents: [],
    exercises,
  }
}

describe('ExerciseRemaining', () => {
  it('counts down the current Exercise on a strip', () => {
    render(
      <ExerciseRemaining
        lesson={lesson([{ id: 'e1', name: 'Hover', minutes: 5 }])}
        now={startedAt + 2 * 60_000}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('3:00 left')
  })

  it('is silent when no duration was set', () => {
    const { container } = render(
      <ExerciseRemaining
        lesson={lesson([{ id: 'e1', name: 'Free fly' }])}
        now={startedAt + 30_000}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('is silent with no running Lesson', () => {
    const { container } = render(<ExerciseRemaining lesson={null} now={startedAt} />)
    expect(container.firstChild).toBeNull()
  })
})
