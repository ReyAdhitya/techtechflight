import { beforeEach, describe, expect, it } from 'vitest'
import {
  assignStudent,
  clearLogbook,
  readLogbook,
  saveRoll,
  studentOf,
} from './logbook'
import { assignEveryone } from './assign-everyone'

describe('assign everyone in board order', () => {
  beforeEach(() => {
    clearLogbook()
  })

  it('fills every free craft from the roster in the order given', () => {
    saveRoll(['Amara', 'Priya', 'Ravi'])

    expect(assignEveryone(['ttf-0002', 'ttf-0001', 'ttf-0003'])).toBe(3)

    const book = readLogbook()
    expect(studentOf(book, 'ttf-0002')).toBe('Amara')
    expect(studentOf(book, 'ttf-0001')).toBe('Priya')
    expect(studentOf(book, 'ttf-0003')).toBe('Ravi')
  })

  it('leaves craft that already have a Student alone', () => {
    saveRoll(['Amara', 'Priya', 'Ravi'])
    assignStudent('ttf-0001', 'Amara')

    expect(assignEveryone(['ttf-0001', 'ttf-0002'])).toBe(1)

    const book = readLogbook()
    expect(studentOf(book, 'ttf-0001')).toBe('Amara')
    expect(studentOf(book, 'ttf-0002')).toBe('Priya')
  })

  it('stops when the roster is exhausted and reports how many were assigned', () => {
    saveRoll(['Priya'])

    expect(assignEveryone(['ttf-0001', 'ttf-0002', 'ttf-0003'])).toBe(1)

    const book = readLogbook()
    expect(studentOf(book, 'ttf-0001')).toBe('Priya')
    expect(studentOf(book, 'ttf-0002')).toBeNull()
    expect(studentOf(book, 'ttf-0003')).toBeNull()
  })

  it('reports nought when nothing is free to fill', () => {
    saveRoll(['Priya'])
    assignStudent('ttf-0001', 'Priya')

    expect(assignEveryone(['ttf-0001'])).toBe(0)
  })
})
