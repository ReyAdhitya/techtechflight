import { describe, expect, it } from 'vitest'
import {
  craftLifetimeHours,
  formatLifetimeHours,
} from './craft-lifetime-hours'
import type { LessonRecord } from './logbook'

const closed = (overrides: Partial<LessonRecord> = {}): LessonRecord => ({
  id: 'lesson-1',
  label: 'Period 3',
  startedAt: 0,
  endedAt: 3_600_000,
  fleetSize: 2,
  readyAtStart: 2,
  incidents: [],
  ...overrides,
})

describe('craftLifetimeHours', () => {
  it('accumulates airborne hours per craft across every closed Lesson', () => {
    const rows = craftLifetimeHours([
      closed({
        id: 'a',
        startedAt: 0,
        endedAt: 3_600_000,
        tally: {
          'drone-1': { flights: 2, faults: 0, dropouts: 0 },
          'drone-2': { flights: 1, faults: 0, dropouts: 0 },
        },
        commands: [
          { at: 1, droneId: 'drone-1', droneName: 'Drone 1', kind: 'takeoff' },
          { at: 2, droneId: 'drone-2', droneName: 'Drone 2', kind: 'takeoff' },
        ],
      }),
      closed({
        id: 'b',
        startedAt: 10_000_000,
        endedAt: 11_800_000,
        tally: {
          'drone-1': { flights: 1, faults: 0, dropouts: 0 },
        },
        commands: [
          { at: 10_000_001, droneId: 'drone-1', droneName: 'Drone 1', kind: 'takeoff' },
        ],
      }),
    ])

    expect(rows).toEqual([
      { droneId: 'drone-1', droneName: 'Drone 1', hours: 1.5 },
      { droneId: 'drone-2', droneName: 'Drone 2', hours: 1 },
    ])
  })

  it('ignores open Lessons and crafts that never took off', () => {
    const rows = craftLifetimeHours([
      closed({
        endedAt: null,
        tally: { 'drone-1': { flights: 3, faults: 0, dropouts: 0 } },
      }),
      closed({
        id: 'grounded',
        tally: { 'drone-9': { flights: 0, faults: 1, dropouts: 0 } },
      }),
    ])
    expect(rows).toEqual([])
  })

  it('keeps craft order by id, not by hours', () => {
    const rows = craftLifetimeHours([
      closed({
        tally: {
          'drone-b': { flights: 5, faults: 0, dropouts: 0 },
          'drone-a': { flights: 1, faults: 0, dropouts: 0 },
        },
      }),
    ])
    expect(rows.map((row) => row.droneId)).toEqual(['drone-a', 'drone-b'])
  })
})

describe('formatLifetimeHours', () => {
  it('renders one decimal and keeps zero visible', () => {
    expect(formatLifetimeHours(0)).toBe('0.0 h')
    expect(formatLifetimeHours(1.25)).toBe('1.3 h')
  })
})
