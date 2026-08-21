import { describe, expect, it, vi } from 'vitest'
import { fetchIpadUrl, groundStationHttpOrigin } from './classroom-setup'

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

describe('the iPad URL', () => {
  it('reads the Student address from the ground station', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ url: 'http://10.0.0.2:4321/student' }), { status: 200 }),
    )
    expect(await fetchIpadUrl('http://localhost:4321', fetchImpl)).toBe(
      'http://10.0.0.2:4321/student',
    )
  })

  it('says nothing when the laptop has no network yet', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ url: null }), { status: 200 }))
    expect(await fetchIpadUrl('http://localhost:4321', fetchImpl)).toBeNull()
  })
})
