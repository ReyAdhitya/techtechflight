import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  assignStudent,
  clearLogbook,
  readLogbook,
  saveRoll,
  studentOf,
} from '@/lib/logbook'
import {
  captureAssignmentUndoPoint,
  clearAssignmentUndo,
} from '@/lib/assignment-undo'
import { AssignmentUndoButton } from './AssignmentUndoButton'

describe('AssignmentUndoButton', () => {
  beforeEach(() => {
    clearLogbook()
    clearAssignmentUndo()
  })

  it('hides when there is nothing to undo', () => {
    const { container } = render(<AssignmentUndoButton />)
    expect(container).toBeEmptyDOMElement()
  })

  it('restores the previous assignment exactly when pressed', async () => {
    const user = userEvent.setup()
    saveRoll(['Priya', 'Ravi'])
    assignStudent('ttf-0001', 'Priya')
    captureAssignmentUndoPoint()
    assignStudent('ttf-0002', 'Ravi')

    const onUndo = vi.fn()
    render(<AssignmentUndoButton canUndo onUndo={onUndo} />)

    await user.click(screen.getByRole('button', { name: 'Undo last assignment' }))

    const book = readLogbook()
    expect(studentOf(book, 'ttf-0001')).toBe('Priya')
    expect(studentOf(book, 'ttf-0002')).toBeNull()
    expect(onUndo).toHaveBeenCalledOnce()
  })
})
