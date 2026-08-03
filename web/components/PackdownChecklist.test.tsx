import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PackdownChecklist } from './PackdownChecklist'

const crafts = [
  { droneId: 'ttf-0001', droneName: 'Drone 1' },
  { droneId: 'ttf-0002', droneName: 'Drone 2' },
] as const

describe('PackdownChecklist', () => {
  it('renders one tickable row per craft and counts from zero', () => {
    render(<PackdownChecklist lessonId="lesson-1" crafts={crafts} />)

    expect(screen.getByRole('status')).toHaveTextContent('0 of 2 packed')
    expect(screen.getByLabelText(/Drone 1/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Drone 2/)).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
  })

  it('ticks a craft and reports Packed in words, not colour alone', () => {
    const onChange = vi.fn()
    render(<PackdownChecklist lessonId="lesson-1" crafts={crafts} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText(/Drone 1/))

    expect(screen.getByRole('status')).toHaveTextContent('1 of 2 packed')
    expect(screen.getByText('Packed')).toBeInTheDocument()
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ lessonId: 'lesson-1', ticked: ['ttf-0001'] }),
    )
  })

  it('resets every tick when the lesson id changes', () => {
    const { rerender } = render(
      <PackdownChecklist lessonId="lesson-1" crafts={crafts} />,
    )
    fireEvent.click(screen.getByLabelText(/Drone 1/))
    expect(screen.getByRole('status')).toHaveTextContent('1 of 2 packed')

    rerender(<PackdownChecklist lessonId="lesson-2" crafts={crafts} />)

    expect(screen.getByRole('status')).toHaveTextContent('0 of 2 packed')
    expect(screen.getByLabelText(/Drone 1/)).not.toBeChecked()
  })
})
