import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { clearLogbook, readLogbook, startLesson } from '@/lib/logbook'
import { LessonIncidentNoteControl } from './LessonIncidentNoteControl'

describe('LessonIncidentNoteControl', () => {
  it('saves a teacher incident note into the running lesson', () => {
    clearLogbook()
    const id = startLesson('Period 3', 6, 6, 1_000)
    render(
      <LessonIncidentNoteControl
        lessonId={id}
        startedAt={1_000}
        now={61_000}
        incidents={[]}
        droneId="ttf-0001"
        droneName="Drone 1"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Note incident' }))
    fireEvent.change(screen.getByPlaceholderText('What you saw'), {
      target: { value: 'Near miss at pad A' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }))
    const lesson = readLogbook().lessons[0]
    expect(lesson?.incidents).toEqual([
      {
        at: 61_000,
        text: 'Near miss at pad A',
        severity: 'attention',
        droneId: 'ttf-0001',
        droneName: 'Drone 1',
      },
    ])
  })
})
