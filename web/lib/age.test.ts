import { describe, expect, it } from 'vitest'
import { formatAge, formatDuration } from './age'

/**
 * Time in words.
 *
 * Two different jobs that read almost the same and are not interchangeable. An age says
 * how long ago a thing was and ends in "ago"; a duration says how much time a window
 * covers and does not. The timeline used to make one out of the other by deleting the
 * word "ago", which worked until the answer was "just now" or "yesterday" — neither of
 * which contains it — and printed "Covering the last just now".
 */

const SECOND = 1_000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

describe('how long ago something was', () => {
  /*
   * Characterisation. `formatAge` had no test of its own; these pin what it already does
   * so the duration work beside it cannot change it by accident.
   */
  it('says just now while a reading is still current', () => {
    expect(formatAge(0)).toBe('just now')
    expect(formatAge(4 * SECOND)).toBe('just now')
  })

  it('counts seconds, then minutes, then hours', () => {
    expect(formatAge(5 * SECOND)).toBe('5s ago')
    expect(formatAge(59 * SECOND)).toBe('59s ago')
    expect(formatAge(MINUTE)).toBe('1m ago')
    expect(formatAge(90 * MINUTE)).toBe('1h ago')
  })

  it('names yesterday rather than counting one day', () => {
    expect(formatAge(DAY)).toBe('yesterday')
    expect(formatAge(3 * DAY)).toBe('3d ago')
  })
})

describe('how much time a window covers', () => {
  /*
   * Every case here is read inside one sentence — "Covering the last ___ — since 11:30 AM"
   * — so each answer is checked as it appears there rather than in isolation.
   */
  const sentence = (ms: number) => `Covering the last ${formatDuration(ms)}`

  it('says a few seconds rather than naming a number too small to matter', () => {
    expect(sentence(0)).toBe('Covering the last few seconds')
    expect(sentence(4 * SECOND)).toBe('Covering the last few seconds')
  })

  it('counts seconds up to a minute', () => {
    expect(sentence(5 * SECOND)).toBe('Covering the last 5 seconds')
    expect(sentence(59 * SECOND)).toBe('Covering the last 59 seconds')
  })

  it('drops the number when there is exactly one of something', () => {
    expect(sentence(MINUTE)).toBe('Covering the last minute')
    expect(sentence(HOUR)).toBe('Covering the last hour')
    expect(sentence(DAY)).toBe('Covering the last day')
  })

  it('counts minutes, hours and days once there is more than one', () => {
    expect(sentence(12 * MINUTE)).toBe('Covering the last 12 minutes')
    expect(sentence(3 * HOUR)).toBe('Covering the last 3 hours')
    expect(sentence(2 * DAY)).toBe('Covering the last 2 days')
  })

  /*
   * The bug this function exists to end. A duration is never built by editing an age:
   * "just now" and "yesterday" carry no "ago" to remove, so the old string surgery left
   * the sentence saying "Covering the last just now".
   */
  it('never leaks the vocabulary of an age into a window', () => {
    for (const ms of [0, SECOND, MINUTE, HOUR, DAY, 5 * DAY]) {
      expect(formatDuration(ms)).not.toContain('ago')
      expect(formatDuration(ms)).not.toContain('just now')
      expect(formatDuration(ms)).not.toContain('yesterday')
    }
  })
})
