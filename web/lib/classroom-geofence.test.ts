import { describe, expect, it } from 'vitest'
import { CLASSROOM_GEOFENCE, CLASSROOM_GEOFENCE_SIZE_M } from './classroom-geofence'

describe('classroom geofence extents', () => {
  it('spans eight metres east-west and six north-south from setup', () => {
    expect(CLASSROOM_GEOFENCE_SIZE_M.widthM).toBe(8)
    expect(CLASSROOM_GEOFENCE_SIZE_M.heightM).toBe(6)
    expect(CLASSROOM_GEOFENCE.westM).toBe(-4)
    expect(CLASSROOM_GEOFENCE.eastM).toBe(4)
    expect(CLASSROOM_GEOFENCE.southM).toBe(-3)
    expect(CLASSROOM_GEOFENCE.northM).toBe(3)
  })
})
