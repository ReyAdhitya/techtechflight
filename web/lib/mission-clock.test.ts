import { describe, expect, it } from 'vitest'
import { emptyMission, type Mission } from './mission.ts'
import {
  formatMissionRemaining,
  missionClock,
  missionRunKey,
  MissionTimeoutTracker,
} from './mission-clock.ts'

/**
 * The Mission clock — acceptance is about honesty at the edges.
 *
 * No limit must never read as zero. Not started must not count down. And crossing zero
 * raises mission-timeout once, not forty times while the class waits for the Teacher.
 */

const START = 1_000_000

function mission(overrides: Partial<Mission> = {}): Mission {
  return {
    ...emptyMission('m1', 'search-rescue', 'Search and Rescue'),
    ...overrides,
  }
}

describe('missionClock', () => {
  it('says Not started before the Mission has a start time, not zero', () => {
    const reading = missionClock(mission({ limitMinutes: 10 }), START)
    expect(reading).toEqual({
      remainingMs: null,
      words: 'Not started',
      timedOut: false,
    })
  })

  it('says No time limit when the Scenario has none, never zero', () => {
    const reading = missionClock(mission({ startedAt: START }), START + 5 * 60_000)
    expect(reading).toEqual({
      remainingMs: null,
      words: 'No time limit',
      timedOut: false,
    })
    expect(reading.remainingMs).not.toBe(0)
  })

  it('counts down from the Scenario limit while time remains', () => {
    const reading = missionClock(
      mission({ startedAt: START, limitMinutes: 5 }),
      START + 2 * 60_000,
    )
    expect(reading.remainingMs).toBe(3 * 60_000)
    expect(reading.words).toBe('3 min left')
    expect(reading.timedOut).toBe(false)
  })

  it('reads Time is up with zero remaining once the limit is spent', () => {
    const reading = missionClock(
      mission({ startedAt: START, limitMinutes: 5 }),
      START + 5 * 60_000,
    )
    expect(reading).toEqual({
      remainingMs: 0,
      words: 'Time is up',
      timedOut: true,
    })
  })

  it('stays timed out after the limit, not a negative countdown', () => {
    const reading = missionClock(
      mission({ startedAt: START, limitMinutes: 5 }),
      START + 20 * 60_000,
    )
    expect(reading.remainingMs).toBe(0)
    expect(reading.timedOut).toBe(true)
    expect(reading.words).toBe('Time is up')
  })

  it('prefers Not started over a limit that is not running yet', () => {
    expect(
      missionClock(mission({ startedAt: null, limitMinutes: 15 }), START).words,
    ).toBe('Not started')
  })
})

describe('formatMissionRemaining', () => {
  it('rounds up to whole minutes so the strip never understates', () => {
    expect(formatMissionRemaining(3 * 60_000)).toBe('3 min left')
    expect(formatMissionRemaining(3 * 60_000 + 1)).toBe('4 min left')
    expect(formatMissionRemaining(60_000)).toBe('1 min left')
    expect(formatMissionRemaining(59_999)).toBe('Under a minute left')
  })
})

describe('missionRunKey', () => {
  it('separates Mission id and start time so a restart can time out again', () => {
    expect(missionRunKey(mission({ startedAt: START }))).toBe('m1:1000000')
    expect(missionRunKey(mission({ startedAt: null }))).toBe('m1:none')
    expect(missionRunKey(mission({ id: 'm2', startedAt: START + 1 }))).toBe('m2:1000001')
  })
})

describe('MissionTimeoutTracker', () => {
  it('raises mission-timeout once when the limit expires, not every tick', () => {
    const tracker = new MissionTimeoutTracker()
    const timed = mission({ startedAt: START, limitMinutes: 5 })
    const atExpiry = START + 5 * 60_000

    const raised = []
    for (let tick = 0; tick < 40; tick += 1) {
      if (tracker.observe(timed, atExpiry + tick)) raised.push(atExpiry + tick)
    }

    expect(raised).toEqual([atExpiry])
  })

  it('does not raise before the limit is spent', () => {
    const tracker = new MissionTimeoutTracker()
    const running = mission({ startedAt: START, limitMinutes: 5 })

    expect(tracker.observe(running, START + 4 * 60_000)).toBe(false)
    expect(tracker.observe(running, START + 4 * 60_000 + 59_999)).toBe(false)
  })

  it('does not raise when there is no limit', () => {
    const tracker = new MissionTimeoutTracker()
    const open = mission({ startedAt: START, limitMinutes: null })

    for (let hour = 0; hour < 3; hour += 1) {
      expect(tracker.observe(open, START + hour * 60 * 60_000)).toBe(false)
    }
  })

  it('does not raise when the Mission has not started', () => {
    const tracker = new MissionTimeoutTracker()
    expect(tracker.observe(mission({ limitMinutes: 10 }), START)).toBe(false)
  })

  it('can raise again after the same Mission restarts with a new start time', () => {
    const tracker = new MissionTimeoutTracker()
    const firstRun = mission({ startedAt: START, limitMinutes: 1 })
    const expiry = START + 60_000

    expect(tracker.observe(firstRun, expiry)).toBe(true)
    expect(tracker.observe(firstRun, expiry + 1_000)).toBe(false)

    const secondRun = mission({ startedAt: START + 10 * 60_000, limitMinutes: 1 })
    const secondExpiry = START + 11 * 60_000
    expect(tracker.observe(secondRun, secondExpiry)).toBe(true)
    expect(tracker.observe(secondRun, secondExpiry + 1_000)).toBe(false)
  })

  it('forgets a raised timeout when the Mission returns to not started', () => {
    const tracker = new MissionTimeoutTracker()
    const timed = mission({ startedAt: START, limitMinutes: 1 })
    const expiry = START + 60_000

    expect(tracker.observe(timed, expiry)).toBe(true)

    const reset = mission({ startedAt: null, limitMinutes: 1 })
    expect(tracker.observe(reset, expiry + 1_000)).toBe(false)

    const rerun = mission({ startedAt: START + 5_000, limitMinutes: 1 })
    expect(tracker.observe(rerun, START + 5_000 + 60_000)).toBe(true)
  })

  it('clears on reset', () => {
    const tracker = new MissionTimeoutTracker()
    const timed = mission({ startedAt: START, limitMinutes: 1 })
    tracker.observe(timed, START + 60_000)
    tracker.reset()
    expect(tracker.observe(timed, START + 60_000)).toBe(true)
  })
})
