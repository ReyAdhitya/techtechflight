import { describe, expect, it } from 'vitest'
import type { LandingTarget } from '@/lib/qr/landing-target'
import { padWallCanScan, padWallReadout, padWallSummary } from './pad-wall'

describe('padWallCanScan', () => {
  it('is false on hardware and when the sim camera is idle or missing', () => {
    const scenarios = {} as never
    expect(padWallCanScan(undefined, scenarios)).toBe(false)
    expect(padWallCanScan({ streaming: false }, scenarios)).toBe(false)
    expect(padWallCanScan({ streaming: true }, null)).toBe(false)
  })

  it('is true when the simulated feed is streaming', () => {
    expect(padWallCanScan({ streaming: true }, {} as never)).toBe(true)
  })
})

describe('padWallReadout', () => {
  const target: LandingTarget = {
    kind: 'pose',
    id: 'pad-A',
    eastM: 2,
    northM: 1,
    raw: 'ttf-land:pad-A;east=2;north=1',
  }

  it('shows an em dash when there is no scan surface', () => {
    expect(padWallReadout(false, null)).toEqual({
      state: 'no-signal',
      headline: '—',
      detail: null,
    })
  })

  it('shows Not seen when scanning finds no landing pad', () => {
    expect(padWallReadout(true, null)).toEqual({
      state: 'not-seen',
      headline: 'Not seen',
      detail: null,
    })
  })

  it('reuses landingTargetPresentation when a pad is decoded', () => {
    expect(padWallReadout(true, target)).toEqual({
      state: 'seen',
      headline: 'Landing target: pad-A',
      detail: 'Where to land — east 2 m · north 1 m',
    })
  })
})

describe('padWallSummary', () => {
  it('counts tiles in the seen state', () => {
    expect(padWallSummary(['no-signal', 'not-seen', 'seen', 'seen'])).toBe(2)
  })
})
