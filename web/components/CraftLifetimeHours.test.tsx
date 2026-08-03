import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CraftLifetimeHours } from './CraftLifetimeHours'
import type { LessonRecord } from '@/lib/logbook'

const closed: LessonRecord = {
  id: 'lesson-1',
  label: 'Period 3',
  startedAt: 0,
  endedAt: 3_600_000,
  fleetSize: 1,
  readyAtStart: 1,
  incidents: [],
  tally: {
    'drone-1': { flights: 2, faults: 0, dropouts: 0 },
  },
  commands: [{ at: 1, droneId: 'drone-1', droneName: 'Drone 1', kind: 'takeoff' }],
}

describe('CraftLifetimeHours', () => {
  it('lists accumulated airborne hours per craft from closed Lessons', () => {
    render(<CraftLifetimeHours lessons={[closed]} />)

    expect(screen.getByRole('heading', { name: 'Lifetime hours' })).toBeTruthy()
    expect(screen.getByText('Drone 1')).toBeTruthy()
    expect(screen.getByText('1.0 h')).toBeTruthy()
  })

  it('says so when nothing has flown yet', () => {
    render(<CraftLifetimeHours lessons={[]} />)
    expect(
      screen.getByText(/No closed Lesson has recorded a takeoff yet/i),
    ).toBeTruthy()
  })
})
