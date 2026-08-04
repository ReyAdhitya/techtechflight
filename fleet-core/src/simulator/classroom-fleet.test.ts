import { describe, expect, it } from 'vitest'
import { CLASSROOM_FLEET, classroomFleet } from './classroom-fleet.ts'

describe('classroomFleet', () => {
  it('builds a single-drone Fleet at the minimum size', () => {
    expect(classroomFleet(1)).toEqual([{ id: 'ttf-0001', name: 'Drone 1', boardOrder: 1 }])
  })

  it('builds twenty Drones at the maximum size', () => {
    const fleet = classroomFleet(20)

    expect(fleet).toHaveLength(20)
    expect(fleet[0]).toEqual({ id: 'ttf-0001', name: 'Drone 1', boardOrder: 1 })
    expect(fleet[19]).toEqual({ id: 'ttf-0020', name: 'Drone 20', boardOrder: 20 })
  })

  it('zero-pads ids to four digits', () => {
    const fleet = classroomFleet(12)

    expect(fleet[11]?.id).toBe('ttf-0012')
  })

  it('names Drones in order from one through size', () => {
    expect(classroomFleet(4).map((drone) => drone.name)).toEqual([
      'Drone 1',
      'Drone 2',
      'Drone 3',
      'Drone 4',
    ])
  })

  it('assigns boardOrder from one through size', () => {
    expect(classroomFleet(5).map((drone) => drone.boardOrder)).toEqual([1, 2, 3, 4, 5])
  })

  it('throws below the minimum size', () => {
    expect(() => classroomFleet(0)).toThrow(
      'Classroom Fleet size must be an integer from 1 to 20, got 0',
    )
  })

  it('throws above the maximum size', () => {
    expect(() => classroomFleet(21)).toThrow(
      'Classroom Fleet size must be an integer from 1 to 20, got 21',
    )
  })

  it('throws for non-integer sizes', () => {
    expect(() => classroomFleet(3.5)).toThrow(
      'Classroom Fleet size must be an integer from 1 to 20, got 3.5',
    )
  })
})

describe('CLASSROOM_FLEET', () => {
  it('is the default six-drone classroom set', () => {
    expect(CLASSROOM_FLEET).toEqual(classroomFleet(6))
  })

  it('keeps the legacy fixed registrations unchanged', () => {
    expect(CLASSROOM_FLEET).toEqual([
      { id: 'ttf-0001', name: 'Drone 1', boardOrder: 1 },
      { id: 'ttf-0002', name: 'Drone 2', boardOrder: 2 },
      { id: 'ttf-0003', name: 'Drone 3', boardOrder: 3 },
      { id: 'ttf-0004', name: 'Drone 4', boardOrder: 4 },
      { id: 'ttf-0005', name: 'Drone 5', boardOrder: 5 },
      { id: 'ttf-0006', name: 'Drone 6', boardOrder: 6 },
    ])
  })
})
