import { afterEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { aDroneState } from '@techtechflight/contract/fixtures'
import { SPARE_NOMINATION_KEY } from '@/lib/spare-nomination'
import { SpareNomination } from './SpareNomination'

afterEach(() => {
  window.localStorage.removeItem(SPARE_NOMINATION_KEY)
})

const drones = [
  aDroneState({ id: 'a', name: 'Drone 1' }),
  aDroneState({ id: 'b', name: 'Drone 2' }),
  aDroneState({ id: 'c', name: 'Drone 3' }),
]

describe('SpareNomination', () => {
  it('lets the Teacher mark one craft as the swap', () => {
    render(<SpareNomination drones={drones} />)
    expect(screen.getByRole('status')).toHaveTextContent('No spare nominated.')
    fireEvent.click(screen.getByLabelText(/Drone 2/))
    expect(screen.getByRole('status')).toHaveTextContent('Swap: Drone 2')
    expect(screen.getByText('Spare')).toBeInTheDocument()
    expect(window.localStorage.getItem(SPARE_NOMINATION_KEY)).toBe('b')
  })

  it('replaces the spare when another craft is marked', () => {
    render(<SpareNomination drones={drones} />)
    fireEvent.click(screen.getByLabelText(/Drone 1/))
    fireEvent.click(screen.getByLabelText(/Drone 3/))
    expect(screen.getByRole('status')).toHaveTextContent('Swap: Drone 3')
    expect(window.localStorage.getItem(SPARE_NOMINATION_KEY)).toBe('c')
  })

  it('clears the nomination', () => {
    render(<SpareNomination drones={drones} />)
    fireEvent.click(screen.getByLabelText(/Drone 2/))
    fireEvent.click(screen.getByRole('button', { name: 'Clear spare' }))
    expect(screen.getByRole('status')).toHaveTextContent('No spare nominated.')
    expect(window.localStorage.getItem(SPARE_NOMINATION_KEY)).toBeNull()
  })
})
