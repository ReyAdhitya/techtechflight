import { describe, expect, it, vi } from 'vitest'
import { airborneIdsToStop, issueStopAll } from './stop-all'

const fleet = [
  { droneId: 'ttf-0001', airborne: true },
  { droneId: 'ttf-0002', airborne: false },
  { droneId: 'ttf-0003', airborne: true },
]

describe('stop-all', () => {
  it('names only airborne craft', () => {
    expect(airborneIdsToStop(fleet)).toEqual(['ttf-0001', 'ttf-0003'])
  })

  it('issues Stop to every airborne craft in board order', () => {
    const stop = vi.fn()
    expect(issueStopAll(fleet, stop)).toEqual(['ttf-0001', 'ttf-0003'])
    expect(stop).toHaveBeenCalledTimes(2)
    expect(stop).toHaveBeenNthCalledWith(1, 'ttf-0001')
    expect(stop).toHaveBeenNthCalledWith(2, 'ttf-0003')
  })
})
