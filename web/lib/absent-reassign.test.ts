import { beforeEach, describe, expect, it } from 'vitest'
import {
  assignStudent,
  clearLogbook,
  isStudentAbsent,
  readLogbook,
  registerStudent,
  saveRoll,
  studentOf,
} from './logbook'
import { markAbsentAndFreeCraft, nextPresentWaitingName } from './absent-reassign'

describe('absent pupil returns their craft to the waiting list', () => {
  beforeEach(() => {
    clearLogbook()
  })

  it('frees the craft and names who is next', () => {
    saveRoll(['Priya', 'Ravi', 'Amara'])
    const priyaId = registerStudent('Priya')!
    assignStudent('ttf-0001', 'Priya')

    const result = markAbsentAndFreeCraft(priyaId)

    expect(result).toEqual({
      studentId: priyaId,
      studentName: 'Priya',
      freedDroneId: 'ttf-0001',
      nextWaitingName: 'Amara',
    })
    const book = readLogbook()
    expect(studentOf(book, 'ttf-0001')).toBeNull()
    expect(isStudentAbsent(book, priyaId)).toBe(true)
  })

  it('still marks absent when they were not flying, and names who is next', () => {
    saveRoll(['Priya', 'Ravi'])
    const priyaId = registerStudent('Priya')!

    const result = markAbsentAndFreeCraft(priyaId)

    expect(result?.freedDroneId).toBeNull()
    expect(result?.nextWaitingName).toBe('Ravi')
    expect(isStudentAbsent(readLogbook(), priyaId)).toBe(true)
  })

  it('skips other absents when naming who is next', () => {
    saveRoll(['Amara', 'Priya', 'Ravi'])
    const amaraId = registerStudent('Amara')!
    const priyaId = registerStudent('Priya')!
    assignStudent('ttf-0001', 'Priya')
    // Amara is waiting but absent — next after freeing Priya should be Ravi.
    markAbsentAndFreeCraft(amaraId)

    expect(nextPresentWaitingName()).toBe('Ravi')
    expect(markAbsentAndFreeCraft(priyaId)?.nextWaitingName).toBe('Ravi')
  })

  it('returns null for an unknown Student', () => {
    expect(markAbsentAndFreeCraft('S-missing')).toBeNull()
  })
})
