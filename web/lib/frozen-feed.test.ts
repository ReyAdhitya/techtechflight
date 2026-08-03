import { describe, expect, it } from 'vitest'
import {
  createFrameClock,
  DEFAULT_FROZEN_WINDOW_MS,
  FROZEN_FEED_MESSAGE,
  isFeedFrozen,
} from './frozen-feed'

describe('frozen feed detector', () => {
  it('says the picture has stopped when no new frame arrives within the window', () => {
    expect(
      isFeedFrozen({
        lastFrameAt: 1_000,
        now: 1_000 + DEFAULT_FROZEN_WINDOW_MS,
        streaming: true,
      }),
    ).toBe(true)
  })

  it('stays quiet while frames keep arriving', () => {
    expect(
      isFeedFrozen({
        lastFrameAt: 5_000,
        now: 5_500,
        windowMs: 3_000,
        streaming: true,
      }),
    ).toBe(false)
  })

  it('never freezes an idle feed with no picture', () => {
    expect(
      isFeedFrozen({
        lastFrameAt: 1_000,
        now: 10_000,
        streaming: false,
      }),
    ).toBe(false)
  })

  it('does not freeze before the first frame', () => {
    expect(
      isFeedFrozen({
        lastFrameAt: null,
        now: 10_000,
        streaming: true,
      }),
    ).toBe(false)
  })

  it('tracks frame arrivals on a clock', () => {
    const clock = createFrameClock()
    expect(clock.lastFrameAt()).toBeNull()
    clock.noteFrame(2_000)
    expect(clock.lastFrameAt()).toBe(2_000)
    clock.reset()
    expect(clock.lastFrameAt()).toBeNull()
  })

  it('keeps the Teacher-facing sentence stable', () => {
    expect(FROZEN_FEED_MESSAGE).toMatch(/Picture has stopped/)
  })
})
