import { describe, expect, it, vi } from 'vitest'
import { airborneIdsToLand, issueLandAll, type LandAllTarget } from './land-all'

const fleet: readonly LandAllTarget[] = [
  { droneId: 'ttf-0001', airborne: true },
  { droneId: 'ttf-0002', airborne: false },
  { droneId: 'ttf-0003', airborne: true },
]

describe('land all', () => {
  it('selects only airborne craft, in board order', () => {
    expect(airborneIdsToLand(fleet)).toEqual(['ttf-0001', 'ttf-0003'])
  })

  it('issues land to every airborne craft and skips the grounded', () => {
    const land = vi.fn()
    const asked = issueLandAll(fleet, land)
    expect(asked).toEqual(['ttf-0001', 'ttf-0003'])
    expect(land).toHaveBeenCalledTimes(2)
    expect(land).toHaveBeenNthCalledWith(1, 'ttf-0001')
    expect(land).toHaveBeenNthCalledWith(2, 'ttf-0003')
  })

  it('asks nothing when the Fleet is grounded', () => {
    const land = vi.fn()
    expect(issueLandAll([{ droneId: 'ttf-0001', airborne: false }], land)).toEqual([])
    expect(land).not.toHaveBeenCalled()
  })
})
