import { describe, expect, it } from 'vitest'
import { aDroneState } from '@techtechflight/contract/fixtures'
import {
  craftFromClosedLesson,
  lastClosedLesson,
  missingCraftSinceLastLesson,
} from './missing-craft'

describe('lastClosedLesson', () => {
  it('picks the closed Lesson with the latest endedAt', () => {
    const lessons = [
      { id: '1', endedAt: 100 },
      { id: '2', endedAt: null },
      { id: '3', endedAt: 300 },
      { id: '4', endedAt: 200 },
    ]
    expect(lastClosedLesson(lessons)?.id).toBe('3')
  })

  it('returns null when none have closed', () => {
    expect(lastClosedLesson([{ id: '1', endedAt: null }])).toBeNull()
  })
})

describe('craftFromClosedLesson', () => {
  it('reads IDs from tally, assignments, and command names', () => {
    expect(
      craftFromClosedLesson({
        endedAt: 1,
        tally: { a: { faults: 0, dropouts: 0, flights: 1 } },
        assignments: { b: 'Sam' },
        commands: [{ droneId: 'c', droneName: 'Drone 3' }],
      }),
    ).toEqual([
      { id: 'a', name: 'a' },
      { id: 'b', name: 'b' },
      { id: 'c', name: 'Drone 3' },
    ])
  })

  it('says nothing for an open or empty Lesson', () => {
    expect(craftFromClosedLesson(null)).toEqual([])
    expect(craftFromClosedLesson({ endedAt: null, tally: { a: {} } })).toEqual([])
  })
})

describe('missingCraftSinceLastLesson', () => {
  it('names craft from the last closed Lesson that are Offline or gone', () => {
    const lesson = {
      endedAt: 1,
      tally: {
        a: { faults: 0, dropouts: 0, flights: 1 },
        b: { faults: 0, dropouts: 0, flights: 1 },
        c: { faults: 0, dropouts: 0, flights: 1 },
      },
      commands: [
        { droneId: 'a', droneName: 'Drone 1' },
        { droneId: 'b', droneName: 'Drone 2' },
        { droneId: 'c', droneName: 'Drone 3' },
      ],
    }
    const missing = missingCraftSinceLastLesson(lesson, [
      aDroneState({ id: 'a', name: 'Drone 1', status: 'Ready' }),
      aDroneState({ id: 'b', name: 'Drone 2', status: 'Offline' }),
    ])
    expect(missing).toEqual([
      { id: 'b', name: 'Drone 2' },
      { id: 'c', name: 'Drone 3' },
    ])
  })

  it('stays quiet when every prior craft is still in contact', () => {
    expect(
      missingCraftSinceLastLesson(
        {
          endedAt: 1,
          tally: { a: { faults: 0, dropouts: 0, flights: 1 } },
        },
        [aDroneState({ id: 'a', name: 'Drone 1', status: 'Ready' })],
      ),
    ).toEqual([])
  })
})
