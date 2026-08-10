import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { classroomFleet } from '@techtechflight/fleet-core/simulator'
import {
  CLASSROOM_FLEET_SIZE_KEY,
  COMFORTABLE_BOARD_SIZE,
  DEFAULT_CLASSROOM_FLEET_SIZE,
  readClassroomFleetSize,
  writeClassroomFleetSize,
} from './classroom-fleet-size'

/**
 * Unlimited Drones.
 *
 * The cap was twenty, a constant with nothing behind it: no screen breaks at twenty-one.
 * Software that refused the Drone a school had just bought would be telling a Teacher their
 * classroom is wrong.
 */

const wipe = () => window.localStorage.removeItem(CLASSROOM_FLEET_SIZE_KEY)
beforeEach(wipe)
afterEach(wipe)

describe('how many Drones the browser Fleet runs', () => {
  it('is six until a Teacher says otherwise', () => {
    expect(readClassroomFleetSize()).toBe(DEFAULT_CLASSROOM_FLEET_SIZE)
  })

  it('takes any whole number a school might own', () => {
    for (const size of [1, 24, 50, 200]) {
      expect(writeClassroomFleetSize(size)).toBe(true)
      expect(readClassroomFleetSize()).toBe(size)
      expect(classroomFleet(readClassroomFleetSize())).toHaveLength(size)
    }
  })

  it('refuses what is not a classroom', () => {
    expect(writeClassroomFleetSize(0)).toBe(false)
    expect(writeClassroomFleetSize(-3)).toBe(false)
    expect(writeClassroomFleetSize(3.5)).toBe(false)
    expect(writeClassroomFleetSize(Number.NaN)).toBe(false)
    expect(readClassroomFleetSize()).toBe(DEFAULT_CLASSROOM_FLEET_SIZE)
  })

  it('falls back rather than breaking on a value somebody else wrote', () => {
    window.localStorage.setItem(CLASSROOM_FLEET_SIZE_KEY, 'lots')
    expect(readClassroomFleetSize()).toBe(DEFAULT_CLASSROOM_FLEET_SIZE)
  })

  /* A display fact, not a Fleet one. Nothing refuses past it; the strips get denser. */
  it('keeps the comfortable board size as guidance rather than a limit', () => {
    expect(COMFORTABLE_BOARD_SIZE).toBe(24)
    expect(writeClassroomFleetSize(COMFORTABLE_BOARD_SIZE + 1)).toBe(true)
  })
})
