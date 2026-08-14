import { afterEach, describe, expect, it } from 'vitest'
import { clearWarmUpSkipped, skipWarmUp, warmUpSkipped } from './warm-up.ts'

/**
 * Skipped once is skipped for that Lesson.
 *
 * Skip was React state on the component that draws the countdown, so it lasted exactly as long
 * as that component stayed mounted. A Teacher who went back to step 1 got the full-screen
 * minute again, over a class already flying.
 */
describe('skipping the warm-up', () => {
  afterEach(clearWarmUpSkipped)

  it('is not skipped until somebody skips it', () => {
    expect(warmUpSkipped('L-1')).toBe(false)
  })

  it('stays skipped for the Lesson it was skipped in', () => {
    skipWarmUp('L-1')

    expect(warmUpSkipped('L-1')).toBe(true)
  })

  /* The next Lesson gets its own minute. Skipping is not a preference. */
  it('does not carry to the next Lesson', () => {
    skipWarmUp('L-1')

    expect(warmUpSkipped('L-2')).toBe(false)
  })

  it('follows the Lesson when a second one is skipped', () => {
    skipWarmUp('L-1')
    skipWarmUp('L-2')

    expect(warmUpSkipped('L-2')).toBe(true)
    expect(warmUpSkipped('L-1')).toBe(false)
  })
})
