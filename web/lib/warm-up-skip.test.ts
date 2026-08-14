import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearWarmUpSkip, skipWarmUp, warmUpSkipped } from './warm-up-skip'

/**
 * Skipped once is skipped for that Lesson.
 *
 * The overlay is a full-screen minute, and Skip lived in the state of the panel that drew it:
 * a Teacher who walked up the rail and back inside that minute met it again, and pressed Skip
 * again. The rail is made to be walked, so this was one press per walk.
 */
describe('skipping the warm-up', () => {
  beforeEach(clearWarmUpSkip)
  afterEach(clearWarmUpSkip)

  it('is not skipped until somebody skips it', () => {
    expect(warmUpSkipped('L-0001')).toBe(false)
  })

  it('stays skipped for the Lesson it was skipped in', () => {
    skipWarmUp('L-0001')

    expect(warmUpSkipped('L-0001')).toBe(true)
  })

  /* Tomorrow's class still gets its warm-up. That is what the Lesson id is for. */
  it('does not carry into the next Lesson', () => {
    skipWarmUp('L-0001')

    expect(warmUpSkipped('L-0002')).toBe(false)
  })

  /* The demonstration has no Lesson id, and a Teacher may skip that minute too. */
  it('remembers a skip on a Lesson with no id', () => {
    skipWarmUp(null)

    expect(warmUpSkipped(null)).toBe(true)
    expect(warmUpSkipped('L-0001')).toBe(false)
  })
})
