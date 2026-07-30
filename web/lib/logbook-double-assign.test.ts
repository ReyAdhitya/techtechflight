import { describe, expect, it } from 'vitest'
import {
  assignStudent,
  clearLogbook,
  readLogbook,
  saveRoll,
  studentAssignedElsewhere,
  studentOf,
} from './logbook'

describe('double-assign guard (D7)', () => {
  it('refuses the same Student on two Drones', () => {
    clearLogbook()
    saveRoll(['Priya', 'Ravi'])
    expect(assignStudent('ttf-0001', 'Priya')).toBe(true)
    expect(assignStudent('ttf-0002', 'Priya')).toBe(false)
    expect(studentOf(readLogbook(), 'ttf-0002')).toBeNull()
  })

  it('reports which Drone already has the name', () => {
    clearLogbook()
    assignStudent('ttf-0001', 'Priya')
    const book = readLogbook()
    expect(studentAssignedElsewhere(book, 'Priya', 'ttf-0002')).toBe('ttf-0001')
    expect(studentAssignedElsewhere(book, 'Priya', 'ttf-0001')).toBeNull()
  })
})
