import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  assignStudent,
  clearLogbook,
  readLogbook,
  registerStudent,
  setStudentAbsent,
} from './logbook'
import { WAITING_LIST_EMPTY, waitingListNames } from './waiting-list'

beforeEach(() => {
  clearLogbook()
})

afterEach(() => {
  clearLogbook()
})

describe('waitingListNames', () => {
  it('lists unassigned Students in roster order', () => {
    registerStudent('Ada')
    registerStudent('Bea')
    registerStudent('Cal')
    assignStudent('ttf-0001', 'Bea')

    expect(waitingListNames(readLogbook())).toEqual(['Ada', 'Cal'])
  })

  it('omits Students marked absent', () => {
    registerStudent('Ada')
    registerStudent('Bea')
    const book = readLogbook()
    const ada = book.roster.find((student) => student.name === 'Ada')
    expect(ada).toBeDefined()
    setStudentAbsent(ada!.studentId, true)

    expect(waitingListNames(readLogbook())).toEqual(['Bea'])
  })

  it('is empty when everyone has a Drone', () => {
    registerStudent('Ada')
    assignStudent('ttf-0001', 'Ada')
    expect(waitingListNames(readLogbook())).toEqual([])
  })
})

describe('WAITING_LIST_EMPTY', () => {
  it('explains an empty list in Teacher words', () => {
    expect(WAITING_LIST_EMPTY).toMatch(/Nobody is waiting/)
    expect(WAITING_LIST_EMPTY).toMatch(/Drone|roll/)
  })
})
