import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Exercise } from '@/lib/logbook'
import { ExerciseList } from './ExerciseList'

const STAY_STILL: Exercise = { id: 'e1', name: 'Stay still in the air', minutes: 5 }
const SQUARE: Exercise = { id: 'e2', name: 'Fly a square' }

describe('planning what a Lesson runs through', () => {
  it('says an empty plan is a normal plan', () => {
    render(<ExerciseList exercises={[]} onChange={() => {}} />)

    expect(screen.getByText(/A Lesson runs without them/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Stay still in the air')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/Hover and hold/i)).not.toBeInTheDocument()
  })

  it('adds one, with a duration when given', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ExerciseList exercises={[]} onChange={onChange} />)

    await user.type(screen.getByLabelText(/Add an exercise/i), 'Stay still in the air')
    await user.type(screen.getByLabelText(/Minutes/i), '5')
    await user.click(screen.getByRole('button', { name: /^Add$/ }))

    expect(onChange.mock.calls[0]?.[0]).toEqual([
      expect.objectContaining({ name: 'Stay still in the air', minutes: 5 }),
    ])
  })

  it('adds one without a duration, which is not half-finished', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ExerciseList exercises={[]} onChange={onChange} />)

    await user.type(screen.getByLabelText(/Add an exercise/i), 'Fly a square')
    await user.click(screen.getByRole('button', { name: /^Add$/ }))

    const added = onChange.mock.calls[0]?.[0]?.[0]
    expect(added?.name).toBe('Fly a square')
    expect(added).not.toHaveProperty('minutes')
  })

  it('reorders by keyboard, rather than needing anything dragged', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ExerciseList exercises={[STAY_STILL, SQUARE]} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /Move Fly a square earlier/i }))

    expect(onChange.mock.calls[0]?.[0]?.map((exercise: Exercise) => exercise.name)).toEqual([
      'Fly a square',
      'Stay still in the air',
    ])
  })

  it('will not move the first one earlier', () => {
    render(<ExerciseList exercises={[STAY_STILL, SQUARE]} onChange={() => {}} />)

    expect(
      screen.getByRole('button', { name: /Move Stay still in the air earlier/i }),
    ).toBeDisabled()
  })

  it('removes one', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ExerciseList exercises={[STAY_STILL, SQUARE]} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /Remove Stay still in the air/i }))

    expect(onChange.mock.calls[0]?.[0]?.map((exercise: Exercise) => exercise.name)).toEqual([
      'Fly a square',
    ])
  })
})
