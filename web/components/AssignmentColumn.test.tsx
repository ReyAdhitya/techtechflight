import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { aDroneState, aTelemetry } from '@techtechflight/contract/fixtures'
import { clearLogbook, readLogbook, saveRoll } from '@/lib/logbook'
import { AssignmentColumn } from './AssignmentColumn'

/**
 * Six of these get filled in during the thirty seconds before a lesson starts. That is the
 * constraint everything here answers to, which is why it is a column of fields rather than
 * anything that has to be dragged.
 */

const FLEET = [
  aDroneState({ id: 'ttf-0001', name: 'Drone 1', status: 'Ready', telemetry: aTelemetry() }),
  aDroneState({ id: 'ttf-0002', name: 'Drone 2', status: 'Not Ready', telemetry: aTelemetry() }),
  aDroneState({ id: 'ttf-0003', name: 'Drone 3', status: 'Ready', telemetry: aTelemetry() }),
]

const column = () => render(<AssignmentColumn drones={FLEET} book={readLogbook()} />)

beforeEach(() => {
  clearLogbook()
})

describe('assigning a class', () => {
  it('offers one field per Drone, in board order', () => {
    column()

    const fields = screen.getAllByRole('combobox')
    expect(fields).toHaveLength(3)
  })

  it('writes a name down, and remembers it for next time', async () => {
    const user = userEvent.setup()
    column()

    await user.type(screen.getByLabelText(/Who is flying Drone 1/i), 'Priya')
    await user.tab()

    expect(readLogbook().students['ttf-0001']).toBe('Priya')
    expect(readLogbook().roll).toContain('Priya')
  })

  it('completes from names already used, so a class is typed once', () => {
    saveRoll(['Priya', 'Ravi'])
    const { container } = column()

    // Read off the datalist itself: a suggestion list has no accessible name to query by,
    // and what matters is that the browser is offered the class.
    const suggestions = [...container.querySelectorAll('datalist option')].map(
      (option) => option.getAttribute('value'),
    )
    expect(suggestions).toEqual(['Priya', 'Ravi'])
  })

  it('says what is wrong with a Drone beside the row it belongs to', () => {
    column()

    expect(screen.getByText(/Not Ready/i)).toBeInTheDocument()
  })
})

describe('one Drone, one Student', () => {
  it('refuses a name already flying something else, rather than reporting it later', async () => {
    const user = userEvent.setup()
    const { rerender } = column()

    await user.type(screen.getByLabelText(/Who is flying Drone 1/i), 'Priya')
    await user.tab()
    rerender(<AssignmentColumn drones={FLEET} book={readLogbook()} />)

    await user.type(screen.getByLabelText(/Who is flying Drone 3/i), 'Priya')

    expect(screen.getByText(/Drone 1 is already assigned to Priya/i)).toBeInTheDocument()
    await user.tab()
    expect(readLogbook().students['ttf-0003']).toBeUndefined()
  })
})
