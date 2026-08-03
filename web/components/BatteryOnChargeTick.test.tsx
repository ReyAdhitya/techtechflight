import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { BatteryOnChargeTick } from './BatteryOnChargeTick'

const packs = [
  { droneId: 'ttf-0001', droneName: 'Drone 1' },
  { droneId: 'ttf-0002', droneName: 'Drone 2' },
] as const

describe('BatteryOnChargeTick', () => {
  it('renders one tickable row per pack and counts from zero', () => {
    render(<BatteryOnChargeTick lessonId="lesson-1" packs={packs} />)

    expect(screen.getByRole('status')).toHaveTextContent('0 of 2 on charge')
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
    expect(screen.getByLabelText(/Drone 1/)).toBeInTheDocument()
  })

  it('records which packs went back on charge', () => {
    const onChange = vi.fn()
    render(
      <BatteryOnChargeTick lessonId="lesson-1" packs={packs} onChange={onChange} />,
    )

    fireEvent.click(screen.getByLabelText(/Drone 2/))

    expect(screen.getByRole('status')).toHaveTextContent('1 of 2 on charge')
    expect(screen.getByText('On charge')).toBeInTheDocument()
    expect(screen.getByText('Place on charge')).toBeInTheDocument()
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ lessonId: 'lesson-1', onCharge: ['ttf-0002'] }),
    )
  })

  it('resets when the lesson id changes', () => {
    const { rerender } = render(
      <BatteryOnChargeTick lessonId="lesson-1" packs={packs} />,
    )
    fireEvent.click(screen.getByLabelText(/Drone 1/))
    expect(screen.getByRole('status')).toHaveTextContent('1 of 2 on charge')

    rerender(<BatteryOnChargeTick lessonId="lesson-2" packs={packs} />)

    expect(screen.getByRole('status')).toHaveTextContent('0 of 2 on charge')
    expect(screen.getByLabelText(/Drone 1/)).not.toBeChecked()
  })
})
