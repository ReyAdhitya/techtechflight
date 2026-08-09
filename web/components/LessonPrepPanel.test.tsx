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
  it('creates a plan from the name the set-up area asked for, and assigns an L- id', () => {
    render(
      <LessonPrepPanel
        drones={[aDroneState({ id: 'ttf-0001', name: 'Drone 1' })]}
        book={readLogbook()}
        lessonName="Year 8 period 3"
      />,
    )

    expect(screen.queryByLabelText(/^Lesson ID$/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Save plan$/ }))

    expect(readLogbook().trainerLessons).toEqual([
      { lessonId: 'L-0001', lessonName: 'Year 8 period 3' },
    ])
  })

  /*
   * One question, one box. This panel used to carry a second *Lesson name* field beside the
   * *What is this lesson?* one over the Start button, and nothing on screen said which of
   * them the Lesson would end up called.
   */
  it('asks for no name of its own', () => {
    render(
      <LessonPrepPanel
        drones={[aDroneState({ id: 'ttf-0001', name: 'Drone 1' })]}
        book={readLogbook()}
      />,
    )

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('will not save a plan with no name, and says what is missing', () => {
    render(
      <LessonPrepPanel
        drones={[aDroneState({ id: 'ttf-0001', name: 'Drone 1' })]}
        book={readLogbook()}
      />,
    )

    expect(screen.getByRole('button', { name: /^Save plan$/ })).toBeDisabled()
    expect(screen.getByText('Name the Lesson above to save a plan.')).toBeInTheDocument()
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
