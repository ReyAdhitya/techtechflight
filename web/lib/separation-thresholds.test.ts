import { afterEach, describe, expect, it } from 'vitest'
import { SEPARATION_WARNING_M } from '@/lib/vitals'
import {
  DEFAULT_SEPARATION_THRESHOLD_M,
  formatSeparationThresholdM,
  isBelowSeparationThreshold,
  parseSeparationThresholdM,
  readSeparationThresholdM,
  resetSeparationThresholdM,
  SEPARATION_THRESHOLD_KEY,
  writeSeparationThresholdM,
} from './separation-thresholds'

afterEach(() => {
  window.localStorage.removeItem(SEPARATION_THRESHOLD_KEY)
})

describe('separation alarm thresholds', () => {
  it("defaults to today's SEPARATION_WARNING_M", () => {
    expect(DEFAULT_SEPARATION_THRESHOLD_M).toBe(SEPARATION_WARNING_M)
    expect(DEFAULT_SEPARATION_THRESHOLD_M).toBe(1.5)
    expect(readSeparationThresholdM()).toBe(1.5)
  })

  it('remembers a Teacher-tuned threshold and can restore the default', () => {
    writeSeparationThresholdM(2.5)
    expect(readSeparationThresholdM()).toBe(2.5)
    resetSeparationThresholdM()
    expect(readSeparationThresholdM()).toBe(DEFAULT_SEPARATION_THRESHOLD_M)
  })

  it('clamps nonsense and out-of-range values', () => {
    expect(parseSeparationThresholdM('')).toBeNull()
    expect(parseSeparationThresholdM('nope')).toBeNull()
    expect(parseSeparationThresholdM('0.1')).toBe(0.5)
    expect(parseSeparationThresholdM('99')).toBe(10)
    expect(parseSeparationThresholdM('2')).toBe(2)
  })

  it('flags craft closer than the threshold, never a missing reading', () => {
    expect(isBelowSeparationThreshold(1.4)).toBe(true)
    expect(isBelowSeparationThreshold(1.5)).toBe(false)
    expect(isBelowSeparationThreshold(null)).toBe(false)
    expect(isBelowSeparationThreshold(2, 2.5)).toBe(true)
  })

  it('formats metres for Settings copy', () => {
    expect(formatSeparationThresholdM(1.5)).toBe('1.5 m')
    expect(formatSeparationThresholdM(2)).toBe('2 m')
  })
})
