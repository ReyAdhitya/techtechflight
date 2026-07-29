import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { aDroneState } from '@techtechflight/contract/fixtures'
import {
  clearLogbook,
  createTrainerLesson,
  readLogbook,
  registerStudent,
} from '@/lib/logbook'
import { LessonPrepPanel } from './LessonPrepPanel'

beforeEach(() => {
  clearLogbook()
})

afterEach(() => {
  clearLogbook()
})

describe('Lesson plan prep', () => {
  it('creates a plan from a name only and assigns an L- id', () => {
    render(<LessonPrepPanel drones={[aDroneState({ id: 'ttf-0001', name: 'Drone 1' })]} book={readLogbook()} />)

    expect(screen.queryByLabelText(/^Lesson ID$/i)).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/^Lesson name$/i), {
      target: { value: 'Year 8 period 3' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^Save plan$/ }))

    expect(readLogbook().trainerLessons).toEqual([
      { lessonId: 'L-0001', lessonName: 'Year 8 period 3' },
    ])
  })

  it('attaches Fleet Drones by existing id, never a typed second key', () => {
    createTrainerLesson('Morning')
    registerStudent('Priya')
    const book = readLogbook()
    const { rerender } = render(
      <LessonPrepPanel
        drones={[
          aDroneState({ id: 'ttf-0001', name: 'Drone 1' }),
          aDroneState({ id: 'ttf-0002', name: 'Drone 2' }),
        ]}
        book={book}
      />,
    )

    fireEvent.click(screen.getAllByRole('button', { name: /^Add to Lesson$/ })[0]!)
    rerender(
      <LessonPrepPanel
        drones={[
          aDroneState({ id: 'ttf-0001', name: 'Drone 1' }),
          aDroneState({ id: 'ttf-0002', name: 'Drone 2' }),
        ]}
        book={readLogbook()}
      />,
    )

    expect(readLogbook().lessonDrones).toEqual([{ lessonId: 'L-0001', droneId: 'ttf-0001' }])
    expect(within(screen.getByRole('list')).queryByLabelText(/Lesson ID/i)).not.toBeInTheDocument()
  })
})
