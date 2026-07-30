import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { assignNextRosterName, clearLogbook, readLogbook, saveRoll, studentOf } from '@/lib/logbook'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { StudentsScreen } from './StudentsScreen'
import { FleetProvider } from './FleetProvider'

describe('one-tap assign on Students', () => {
  it('assigns the next roster name to the first free Drone', async () => {
    const user = userEvent.setup()
    clearLogbook()
    saveRoll(['Priya', 'Ravi'])

    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <StudentsScreen />
      </FleetProvider>,
    )

    await user.click(screen.getByRole('button', { name: /Assign Priya/i }))

    const book = readLogbook()
    expect(studentOf(book, 'ttf-0001')).toBe('Priya')
    expect(assignNextRosterName('ttf-0002')).toBe('Ravi')
  })
})
