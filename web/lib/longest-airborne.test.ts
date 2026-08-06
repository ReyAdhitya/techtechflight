import { describe, expect, it } from 'vitest'
import {
  AirborneTracker,
  formatAirborneDuration,
  longestAirborne,
  longestAirborneSentence,
} from './longest-airborne'

describe('longestAirborne', () => {
  it('names the craft airborne longest with its duration', () => {
    const now = 1_000_000
    const result = longestAirborne(
      [
        {
          droneId: 'a',
          callsign: 'Drone 1',
          airborne: true,
          airborneSince: now - 90_000,
        },
        {
          droneId: 'b',
          callsign: 'Drone 2',
          airborne: true,
          airborneSince: now - 180_000,
        },
        {
          droneId: 'c',
          callsign: 'Drone 3',
          airborne: false,
          airborneSince: null,
        },
      ],
      now,
    )
    expect(result).toEqual({
      droneId: 'b',
      callsign: 'Drone 2',
      durationMs: 180_000,
    })
    expect(longestAirborneSentence(result)).toBe(
      'Drone 2 has been up longest, 3:00',
    )
  })

  it('is silent when nobody is airborne with a known start', () => {
    expect(
      longestAirborne(
        [
          {
            droneId: 'a',
            callsign: 'Drone 1',
            airborne: false,
            airborneSince: null,
          },
          {
            droneId: 'b',
            callsign: 'Drone 2',
            airborne: true,
            airborneSince: null,
          },
        ],
        1_000_000,
      ),
    ).toBeNull()
  })

  it('keeps board order on a tie rather than reordering', () => {
    const now = 1_000_000
    const result = longestAirborne(
      [
        {
          droneId: 'a',
          callsign: 'Drone 1',
          airborne: true,
          airborneSince: now - 60_000,
        },
        {
          droneId: 'b',
          callsign: 'Drone 2',
          airborne: true,
          airborneSince: now - 60_000,
        },
      ],
      now,
    )
    expect(result?.callsign).toBe('Drone 1')
  })
})

describe('formatAirborneDuration', () => {
  it('reads as m:ss, matching the Lesson elapsed clock', () => {
    expect(formatAirborneDuration(3 * 60_000 + 12_000)).toBe('3:12')
    expect(formatAirborneDuration(45_000)).toBe('0:45')
  })
})

describe('AirborneTracker', () => {
  it('stamps the first airborne observation and clears on landing', () => {
    const tracker = new AirborneTracker()
    tracker.observe(
      [
        { droneId: 'a', airborne: true },
        { droneId: 'b', airborne: false },
      ],
      100,
    )
    expect(tracker.sinceOf('a')).toBe(100)
    expect(tracker.sinceOf('b')).toBeNull()

    tracker.observe(
      [
        { droneId: 'a', airborne: true },
        { droneId: 'b', airborne: true },
      ],
      200,
    )
    expect(tracker.sinceOf('a')).toBe(100)
    expect(tracker.sinceOf('b')).toBe(200)

    tracker.observe([{ droneId: 'a', airborne: false }], 300)
    expect(tracker.sinceOf('a')).toBeNull()
  })
})
