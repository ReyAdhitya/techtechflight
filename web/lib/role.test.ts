import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  BOARD_ROLE_KEY,
  clearBoardRole,
  readBoardRole,
  writeBoardRole,
} from './role'

beforeEach(() => {
  window.localStorage.removeItem(BOARD_ROLE_KEY)
})

afterEach(() => {
  window.localStorage.removeItem(BOARD_ROLE_KEY)
})

describe('board role', () => {
  it('remembers Teacher or Student until cleared', () => {
    expect(readBoardRole()).toBeNull()
    writeBoardRole('teacher')
    expect(readBoardRole()).toBe('teacher')
    writeBoardRole('student')
    expect(readBoardRole()).toBe('student')
    clearBoardRole()
    expect(readBoardRole()).toBeNull()
  })
})
