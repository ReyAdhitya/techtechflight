import { beforeEach, describe, expect, it } from 'vitest'
import {
  assignStudent,
  clearLogbook,
  readLogbook,
  saveRoll,
  studentOf,
} from './logbook'
import {
  canUndoAssignment,
  captureAssignmentUndoPoint,
  clearAssignmentUndo,
  undoLastAssignment,
  withAssignmentUndo,
} from './assignment-undo'

describe('undo the last assignment', () => {
  beforeEach(() => {
    clearLogbook()
    clearAssignmentUndo()
  })

  it('restores the previous assignment exactly', () => {
    saveRoll(['Priya', 'Ravi'])
    assignStudent('ttf-0001', 'Priya')
    captureAssignmentUndoPoint()
    assignStudent('ttf-0002', 'Ravi')

    expect(undoLastAssignment()).toBe(true)

    const book = readLogbook()
    expect(studentOf(book, 'ttf-0001')).toBe('Priya')
    expect(studentOf(book, 'ttf-0002')).toBeNull()
    expect(canUndoAssignment()).toBe(false)
  })

  it('restores a clear as well as a fill', () => {
    saveRoll(['Priya'])
    assignStudent('ttf-0001', 'Priya')
    captureAssignmentUndoPoint()
    assignStudent('ttf-0001', '')

    expect(undoLastAssignment()).toBe(true)
    expect(studentOf(readLogbook(), 'ttf-0001')).toBe('Priya')
  })

  it('does nothing when no point was captured', () => {
    assignStudent('ttf-0001', 'Priya')

    expect(undoLastAssignment()).toBe(false)
    expect(studentOf(readLogbook(), 'ttf-0001')).toBe('Priya')
  })

  it('wraps a mutation so the Integrator need not remember to capture', () => {
    saveRoll(['Priya', 'Ravi'])
    assignStudent('ttf-0001', 'Priya')

    withAssignmentUndo(() => {
      assignStudent('ttf-0001', '')
      assignStudent('ttf-0002', 'Ravi')
    })

    expect(undoLastAssignment()).toBe(true)
    const book = readLogbook()
    expect(studentOf(book, 'ttf-0001')).toBe('Priya')
    expect(studentOf(book, 'ttf-0002')).toBeNull()
  })
})
