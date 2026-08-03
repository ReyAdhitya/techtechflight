import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CraftReturnedTick } from './CraftReturnedTick'

const crafts = [
  { droneId: 'ttf-0001', droneName: 'Drone 1' },
  { droneId: 'ttf-0002', droneName: 'Drone 2' },
  { droneId: 'ttf-0003', droneName: 'Drone 3' },
] as const

describe('CraftReturnedTick', () => {
  it('shows the headcount out from zero and names every craft missing', () => {
    render(<CraftReturnedTick lessonId="lesson-1" crafts={crafts} />)

    expect(screen.getByRole('status')).toHaveTextContent('0 of 3 returned')
    expect(screen.getByText('Missing: Drone 1, Drone 2, Drone 3')).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
  })

  it('names any craft still missing after ticks', () => {
    const onChange = vi.fn()
    render(
      <CraftReturnedTick lessonId="lesson-1" crafts={crafts} onChange={onChange} />,
    )

    fireEvent.click(screen.getByLabelText(/Drone 1/))
    fireEvent.click(screen.getByLabelText(/Drone 3/))

    expect(screen.getByRole('status')).toHaveTextContent('2 of 3 returned')
    expect(screen.getByText('Missing: Drone 2')).toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        lessonId: 'lesson-1',
        returned: ['ttf-0001', 'ttf-0003'],
      }),
    )
  })

  it('says None missing when the headcount is complete', () => {
    render(<CraftReturnedTick lessonId="lesson-1" crafts={crafts} />)
    for (const craft of crafts) {
      fireEvent.click(screen.getByLabelText(new RegExp(craft.droneName)))
    }
    expect(screen.getByRole('status')).toHaveTextContent('3 of 3 returned')
    expect(screen.getByText('None missing')).toBeInTheDocument()
  })

  it('resets when the lesson id changes', () => {
    const { rerender } = render(
      <CraftReturnedTick lessonId="lesson-1" crafts={crafts} />,
    )
    fireEvent.click(screen.getByLabelText(/Drone 1/))
    expect(screen.getByRole('status')).toHaveTextContent('1 of 3 returned')

    rerender(<CraftReturnedTick lessonId="lesson-2" crafts={crafts} />)

    expect(screen.getByRole('status')).toHaveTextContent('0 of 3 returned')
    expect(screen.getByText('Missing: Drone 1, Drone 2, Drone 3')).toBeInTheDocument()
  })
})
