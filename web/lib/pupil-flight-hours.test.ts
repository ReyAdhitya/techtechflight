import { beforeEach, describe, expect, it } from 'vitest'
import {
  airborneMsFromEvents,
  clearPupilFlightHours,
  fallbackAirborneMsFromLesson,
  formatAirborneDuration,
  pupilAirborneMs,
  readPupilFlightSeals,
  sealPupilFlightHours,
} from './pupil-flight-hours'
import type { LessonRecord, Logbook } from './logbook'

beforeEach(() => {
  clearPupilFlightHours()
})

function aLesson(partial: Partial<LessonRecord> & Pick<LessonRecord, 'id'>): LessonRecord {
  return {
    label: 'Period 3',
    startedAt: 0,
    endedAt: 600_000,
    readyAtStart: 4,
    fleetSize: 6,
    incidents: [],
    ...partial,
  }
}

function aBook(lessons: readonly LessonRecord[], roster: Logbook['roster'] = []): Logbook {
  return {
    notes: {},
    service: {},
    lessons,
    students: {},
    roll: roster.map((student) => student.name),
    roster,
    trainerDrones: [],
    trainerLessons: [],
    lessonDrones: [],
    lessonAssignments: [],
  }
}

describe('airborneMsFromEvents', () => {
  it('sums takeoff-to-land intervals against the assignment', () => {
    const ms = airborneMsFromEvents(
      [
        { droneId: 'a', kind: 'took-off', at: 100 },
        { droneId: 'a', kind: 'landed', at: 400 },
        { droneId: 'a', kind: 'took-off', at: 500 },
        { droneId: 'a', kind: 'landed', at: 700 },
      ],
      { a: 'S-0001' },
      1_000,
    )
    expect(ms['S-0001']).toBe(500)
  })

  it('closes an open takeoff at lesson end', () => {
    const ms = airborneMsFromEvents(
      [{ droneId: 'a', kind: 'took-off', at: 100 }],
      { a: 'Amara' },
      1_000,
    )
    expect(ms['Amara']).toBe(900)
  })
})

describe('fallback from closed Lessons', () => {
  it('attributes Lesson wall-clock when the craft took off', () => {
    const lesson = aLesson({
      id: 'l1',
      startedAt: 0,
      endedAt: 120_000,
      assignments: { 'ttf-0001': 'Amara' },
      tally: { 'ttf-0001': { faults: 0, dropouts: 0, flights: 1 } },
    })
    expect(fallbackAirborneMsFromLesson(lesson)['Amara']).toBe(120_000)
  })

  it('stays at zero when the assigned craft never took off', () => {
    const lesson = aLesson({
      id: 'l1',
      assignments: { 'ttf-0001': 'Amara' },
      tally: { 'ttf-0001': { faults: 0, dropouts: 0, flights: 0 } },
    })
    expect(fallbackAirborneMsFromLesson(lesson)['Amara']).toBeUndefined()
  })
})

describe('pupilAirborneMs', () => {
  it('prefers a sealed Lesson over the wall-clock fallback', () => {
    sealPupilFlightHours({
      lessonId: 'l1',
      airborneMsByStudent: { 'S-0001': 30_000 },
    })
    const book = aBook(
      [
        aLesson({
          id: 'l1',
          startedAt: 0,
          endedAt: 600_000,
          assignments: { 'ttf-0001': 'S-0001' },
          tally: { 'ttf-0001': { faults: 0, dropouts: 0, flights: 2 } },
        }),
      ],
      [{ studentId: 'S-0001', name: 'Amara' }],
    )
    expect(pupilAirborneMs(book, 'S-0001', readPupilFlightSeals())).toEqual({
      studentKey: 'S-0001',
      airborneMs: 30_000,
      lessonCount: 1,
    })
  })

  it('accumulates across closed Lessons and renders zero when none apply', () => {
    const book = aBook(
      [
        aLesson({
          id: 'l1',
          startedAt: 0,
          endedAt: 60_000,
          assignments: { a: 'Amara' },
          tally: { a: { faults: 0, dropouts: 0, flights: 1 } },
        }),
        aLesson({
          id: 'l2',
          startedAt: 100_000,
          endedAt: 160_000,
          assignments: { a: 'Amara' },
          tally: { a: { faults: 0, dropouts: 0, flights: 1 } },
        }),
        aLesson({
          id: 'open',
          endedAt: null,
          assignments: { a: 'Amara' },
          tally: { a: { faults: 0, dropouts: 0, flights: 1 } },
        }),
      ],
      [{ studentId: 'S-1', name: 'Amara' }],
    )
    expect(pupilAirborneMs(book, 'Amara').airborneMs).toBe(120_000)
    expect(pupilAirborneMs(book, 'Amara').lessonCount).toBe(2)
    expect(pupilAirborneMs(book, 'Nobody').airborneMs).toBe(0)
  })
})

describe('formatAirborneDuration', () => {
  it('speaks minutes and hours in Teacher words', () => {
    expect(formatAirborneDuration(0)).toBe('0 min')
    expect(formatAirborneDuration(90_000)).toBe('1 min')
    expect(formatAirborneDuration(3_600_000)).toBe('1 h')
    expect(formatAirborneDuration(3_660_000)).toBe('1 h 1 min')
  })
})
