import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LessonPlanWizard } from './LessonPlanWizard'

describe('LessonPlanWizard', () => {
  it('walks label → exercises → confirm and starts the lesson', () => {
    const onStart = vi.fn()

    render(
      <LessonPlanWizard
        label=""
        onLabelChange={() => {}}
        exercises={[]}
        onExercisesChange={() => {}}
        usableCount={6}
        fleetSize={6}
        onStart={onStart}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Exercises' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start the lesson' }))

    expect(onStart).toHaveBeenCalledOnce()
  })

  it('keeps Start now visible on step one for E7', () => {
    render(
      <LessonPlanWizard
        label=""
        onLabelChange={() => {}}
        exercises={[]}
        onExercisesChange={() => {}}
        usableCount={6}
        fleetSize={6}
        onStart={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: 'Start now' })).toBeEnabled()
  })
})
