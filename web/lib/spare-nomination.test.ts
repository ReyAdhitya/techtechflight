import { afterEach, describe, expect, it } from 'vitest'
import {
  readSpareNomination,
  SPARE_NOMINATION_KEY,
  spareAmongFleet,
  writeSpareNomination,
} from './spare-nomination'

afterEach(() => {
  window.localStorage.removeItem(SPARE_NOMINATION_KEY)
})

describe('spare nomination storage', () => {
  it('starts with no spare marked', () => {
    expect(readSpareNomination()).toBeNull()
  })

  it('remembers one craft as the swap and replaces on a second mark', () => {
    writeSpareNomination('ttf-0003')
    expect(readSpareNomination()).toBe('ttf-0003')
    writeSpareNomination('ttf-0001')
    expect(readSpareNomination()).toBe('ttf-0001')
  })

  it('clears when the Teacher unmarks the spare', () => {
    writeSpareNomination('ttf-0003')
    writeSpareNomination(null)
    expect(readSpareNomination()).toBeNull()
    expect(window.localStorage.getItem(SPARE_NOMINATION_KEY)).toBeNull()
  })
})

describe('spareAmongFleet', () => {
  it('drops a nomination that is no longer in the Fleet', () => {
    expect(spareAmongFleet('gone', new Set(['a', 'b']))).toBeNull()
    expect(spareAmongFleet('a', new Set(['a', 'b']))).toBe('a')
    expect(spareAmongFleet(null, new Set(['a']))).toBeNull()
  })
})
