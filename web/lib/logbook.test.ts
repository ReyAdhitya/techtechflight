import { beforeEach, describe, expect, it } from 'vitest'
import type { FleetEvent, FleetEventKind } from '@techtechflight/contract'
import {
  alreadyTallied,
  clearLogbook,
  endLesson,
  persistedTally,
  readLogbook,
  startLesson,
  talliedLessonCount,
  talliedWindows,
  tallyEvents,
} from './logbook'

/**
 * The counts a Teacher takes to the supplier.
 *
 * These are the numbers that decide whether an airframe goes back, so the thing worth
 * testing hardest is not that they add up — it is that they do not add up twice.
 */

function event(at: number, droneId: string, kind: FleetEventKind): FleetEvent {
  return {
    id: `${droneId}@${at}#${kind}`,
    at,
    droneId,
    droneName: droneId.toUpperCase(),
    kind,
    from: null,
    to: 'Ready',
    detail: null,
    severity: kind === 'fault-raised' ? 'fault' : 'routine',
  }
}

beforeEach(() => {
  clearLogbook()
})

describe('tallyEvents', () => {
  it('counts faults, dropouts, and flights per Drone', () => {
    const tally = tallyEvents([
      event(10, 'a', 'fault-raised'),
      event(20, 'a', 'took-off'),
      event(30, 'a', 'contact-lost'),
      event(40, 'b', 'took-off'),
    ])

    expect(tally['a']).toEqual({ faults: 1, dropouts: 1, flights: 1 })
    expect(tally['b']).toEqual({ faults: 0, dropouts: 0, flights: 1 })
  })

  it('ignores the kinds that say nothing about reliability', () => {
    const tally = tallyEvents([
      event(10, 'a', 'landed'),
      event(20, 'a', 'became-ready'),
      event(30, 'a', 'fault-cleared'),
    ])

    expect(tally['a']).toEqual({ faults: 0, dropouts: 0, flights: 0 })
  })

  it('has no entry for a Drone that did nothing', () => {
    expect(tallyEvents([])['a']).toBeUndefined()
  })
})

describe('a lesson that closes', () => {
  it('keeps the counts after the events themselves are gone', () => {
    const id = startLesson('Year 8', 4, 6, 1_000)
    endLesson(id, 5_000, tallyEvents([event(2_000, 'a', 'fault-raised')]))

    // Nothing is passed in here — this is the ground station having been restarted.
    expect(persistedTally(readLogbook())['a']).toEqual({
      faults: 1,
      dropouts: 0,
      flights: 0,
    })
  })

  it('sums across every lesson in the record', () => {
    const first = startLesson('Monday', 6, 6, 1_000)
    endLesson(first, 2_000, tallyEvents([event(1_500, 'a', 'fault-raised')]))
    const second = startLesson('Tuesday', 6, 6, 3_000)
    endLesson(
      second,
      4_000,
      tallyEvents([event(3_500, 'a', 'fault-raised'), event(3_600, 'a', 'took-off')]),
    )

    expect(persistedTally(readLogbook())['a']).toEqual({
      faults: 2,
      dropouts: 0,
      flights: 1,
    })
    expect(talliedLessonCount(readLogbook())).toBe(2)
  })

  it('records the incidents with the Drone that caused them', () => {
    startLesson('Year 8', 4, 6, 1_000)
    expect(readLogbook().lessons[0]?.incidents).toEqual([])
  })
})

describe('a lesson still under way', () => {
  it('contributes no counts and no window', () => {
    startLesson('Year 8', 4, 6, 1_000)

    expect(persistedTally(readLogbook())).toEqual({})
    expect(talliedWindows(readLogbook())).toEqual([])
  })
})

describe('the overlap between the two sources', () => {
  it('treats an event inside a closed lesson as already counted', () => {
    const id = startLesson('Year 8', 4, 6, 1_000)
    endLesson(id, 5_000, tallyEvents([event(2_000, 'a', 'fault-raised')]))
    const windows = talliedWindows(readLogbook())

    expect(alreadyTallied(windows, 2_000)).toBe(true)
    // The boundaries belong to the lesson too — an event at the closing moment was seen.
    expect(alreadyTallied(windows, 1_000)).toBe(true)
    expect(alreadyTallied(windows, 5_000)).toBe(true)
  })

  it('leaves an event outside every lesson to be counted live', () => {
    const id = startLesson('Year 8', 4, 6, 1_000)
    endLesson(id, 5_000, tallyEvents([event(2_000, 'a', 'fault-raised')]))
    const windows = talliedWindows(readLogbook())

    expect(alreadyTallied(windows, 999)).toBe(false)
    expect(alreadyTallied(windows, 5_001)).toBe(false)
  })

  it('does not double count a fault the ground station still remembers', () => {
    const fault = event(2_000, 'a', 'fault-raised')
    const id = startLesson('Year 8', 4, 6, 1_000)
    endLesson(id, 5_000, tallyEvents([fault]))

    const book = readLogbook()
    const windows = talliedWindows(book)
    // The same event, still inside the ground station's retained window.
    const live = tallyEvents([fault].filter((candidate) => !alreadyTallied(windows, candidate.at)))

    const saved = persistedTally(book)['a']!
    expect(saved.faults + (live['a']?.faults ?? 0)).toBe(1)
  })
})

describe('a record written before the board kept counts', () => {
  it('is skipped rather than treated as a lesson with no faults', () => {
    const id = startLesson('Year 8', 4, 6, 1_000)
    // endLesson is what attaches a tally; a record closed by an older build has none.
    const book = readLogbook()
    const closedWithoutTally = {
      ...book,
      lessons: book.lessons.map((lesson) =>
        lesson.id === id ? { ...lesson, endedAt: 5_000 } : lesson,
      ),
    }

    expect(talliedWindows(closedWithoutTally)).toEqual([])
    expect(persistedTally(closedWithoutTally)).toEqual({})
  })
})
