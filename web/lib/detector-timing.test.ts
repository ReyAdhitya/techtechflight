import { describe, expect, it } from 'vitest'
import { appendTimingFrame, detectorTiming } from './detector-timing'

describe('detectorTiming', () => {
  it('says not enough frames yet before an average is meaningful', () => {
    const empty = detectorTiming([])
    expect(empty.fps).toBeNull()
    expect(empty.latencyMs).toBeNull()
    expect(empty.fpsWords).toMatch(/not enough frames yet/i)
    expect(empty.latencyWords).toMatch(/not measured yet/i)

    const one = detectorTiming([{ finishedAtMs: 1_000, latencyMs: 400 }])
    expect(one.fpsWords).toMatch(/not enough frames yet/i)
    expect(one.latencyWords).toMatch(/not measured yet/i)
  })

  it('reports fps and latency in words once enough frames have run', () => {
    const frames = appendTimingFrame(
      appendTimingFrame([], 500, 1_000),
      520,
      1_500,
    )
    const timing = detectorTiming(frames)

    expect(timing.fps).toBe(2)
    expect(timing.latencyMs).toBe(510)
    expect(timing.fpsWords).toBe('2 frames per second')
    expect(timing.latencyWords).toBe('510 ms per frame')
  })
})
