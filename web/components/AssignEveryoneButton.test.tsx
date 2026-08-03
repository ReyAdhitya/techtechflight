import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  assignStudent,
  clearLogbook,
  readLogbook,
  saveRoll,
  studentOf,
} from '@/lib/logbook'
import { AssignEveryoneButton } from './AssignEveryoneButton'

describe('AssignEveryoneButton', () => {
  beforeEach(() => {
    clearLogbook()
  })

  it('fills free craft in board order and reports how many were assigned', async () => {
    const user = userEvent.setup()
    saveRoll(['Amara', 'Priya', 'Ravi'])

    render(<AssignEveryoneButton droneIds={['ttf-0001', 'ttf-0002']} />)

    await user.click(screen.getByRole('button', { name: 'Assign everyone' }))

    expect(screen.getByRole('status')).toHaveTextContent('Assigned 2')
    const book = readLogbook()
    expect(studentOf(book, 'ttf-0001')).toBe('Amara')
    expect(studentOf(book, 'ttf-0002')).toBe('Priya')
  })

  it('reports nought when every craft already has someone', async () => {
    const user = userEvent.setup()
    saveRoll(['Priya'])
    assignStudent('ttf-0001', 'Priya')

    render(<AssignEveryoneButton droneIds={['ttf-0001']} />)

    await user.click(screen.getByRole('button', { name: 'Assign everyone' }))

    expect(screen.getByRole('status')).toHaveTextContent('Assigned 0')
  })
})
