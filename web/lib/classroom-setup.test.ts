import { describe, expect, it } from 'vitest'
import { groundStationHttpOrigin } from './classroom-setup'

describe('ground station HTTP origin for Classroom setup', () => {
  it('uses the same origin when the board is already on :4321', () => {
    expect(
      groundStationHttpOrigin({ protocol: 'http:', hostname: 'localhost', port: '4321' }),
    ).toBe('http://localhost:4321')
  })

  it('points at :4321 when Next is serving the board on another port', () => {
    expect(
      groundStationHttpOrigin({ protocol: 'http:', hostname: 'localhost', port: '3000' }),
    ).toBe('http://localhost:4321')
  })
})
