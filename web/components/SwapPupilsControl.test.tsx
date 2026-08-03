import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  assignStudent,
  clearLogbook,
  readLogbook,
  studentOf,
} from '@/lib/logbook'
import { SwapPupilsControl } from './SwapPupilsControl'

const OPTIONS = [
  { droneId: 'ttf-0001', droneName: 'Drone 1', studentName: 'Priya' },
  { droneId: 'ttf-0002', droneName: 'Drone 2', studentName: 'Ravi' },
  { droneId: 'ttf-0003', droneName: 'Drone 3', studentName: null },
] as const

describe('SwapPupilsControl', () => {
  beforeEach(() => {
    clearLogbook()
  })

  it('uses swapStudentAssignments so both craft exchange Students', async () => {
    const user = userEvent.setup()
    assignStudent('ttf-0001', 'Priya')
    assignStudent('ttf-0002', 'Ravi')
    const onSwapped = vi.fn()

    render(<SwapPupilsControl options={OPTIONS} onSwapped={onSwapped} />)

    await user.selectOptions(screen.getByLabelText('First Student'), 'ttf-0001')
    await user.selectOptions(screen.getByLabelText('Second Student'), 'ttf-0002')
    await user.click(screen.getByRole('button', { name: 'Swap Students' }))

    const book = readLogbook()
    expect(studentOf(book, 'ttf-0001')).toBe('Ravi')
    expect(studentOf(book, 'ttf-0002')).toBe('Priya')
    expect(onSwapped).toHaveBeenCalledOnce()
  })

  it('keeps Swap disabled until two different craft are chosen', () => {
    render(<SwapPupilsControl options={OPTIONS} />)

    expect(screen.getByRole('button', { name: 'Swap Students' })).toBeDisabled()
  })
})
