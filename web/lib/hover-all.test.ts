import { describe, expect, it, vi } from 'vitest'
import { airborneIdsToHover, issueHoverAll } from './hover-all'

const fleet = [
  { droneId: 'ttf-0001', airborne: true },
  { droneId: 'ttf-0002', airborne: false },
  { droneId: 'ttf-0003', airborne: true },
]

describe('hover-all', () => {
  it('names only airborne craft', () => {
    expect(airborneIdsToHover(fleet)).toEqual(['ttf-0001', 'ttf-0003'])
  })

  it('issues hold to every airborne craft in board order', () => {
    const hover = vi.fn()
    expect(issueHoverAll(fleet, hover)).toEqual(['ttf-0001', 'ttf-0003'])
    expect(hover).toHaveBeenCalledTimes(2)
    expect(hover).toHaveBeenNthCalledWith(1, 'ttf-0001')
    expect(hover).toHaveBeenNthCalledWith(2, 'ttf-0003')
  })
})
