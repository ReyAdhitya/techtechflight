import { describe, expect, it } from 'vitest'
import { landingTargetPresentation, parseLandingTarget } from './landing-target'

/**
 * Landing-target framing for QR payloads (#51).
 *
 * Non-landing codes must stay quiet — this is not an inventory scanner.
 */

describe('parseLandingTarget', () => {
  it('reads a pad identity', () => {
    expect(parseLandingTarget('ttf-land:pad-A')).toEqual({
      kind: 'identity',
      id: 'pad-A',
      raw: 'ttf-land:pad-A',
    })
  })

  it('reads a pad pose in the classroom east/north frame', () => {
    expect(parseLandingTarget('ttf-land:pad-A;east=2;north=1')).toEqual({
      kind: 'pose',
      id: 'pad-A',
      eastM: 2,
      northM: 1,
      raw: 'ttf-land:pad-A;east=2;north=1',
    })
  })

  it('accepts fractional metres', () => {
    expect(parseLandingTarget('ttf-land:pad-B;east=1.5;north=-0.25')).toEqual({
      kind: 'pose',
      id: 'pad-B',
      eastM: 1.5,
      northM: -0.25,
      raw: 'ttf-land:pad-B;east=1.5;north=-0.25',
    })
  })

  it('ignores codes that are not landing markers', () => {
    expect(parseLandingTarget('https://example.com')).toBeNull()
    expect(parseLandingTarget('inventory:drone-3')).toBeNull()
    expect(parseLandingTarget('')).toBeNull()
  })

  it('rejects a half-written pose rather than inventing a zero', () => {
    expect(parseLandingTarget('ttf-land:pad-A;east=2')).toBeNull()
    expect(parseLandingTarget('ttf-land:pad-A;north=1')).toBeNull()
    expect(parseLandingTarget('ttf-land:pad-A;east=nope;north=1')).toBeNull()
  })

  it('rejects an empty pad id', () => {
    expect(parseLandingTarget('ttf-land:')).toBeNull()
    expect(parseLandingTarget('ttf-land:;east=1;north=2')).toBeNull()
  })
})

describe('landingTargetPresentation', () => {
  it('names the pad as where to land', () => {
    expect(landingTargetPresentation({ kind: 'identity', id: 'pad-A', raw: 'ttf-land:pad-A' })).toEqual({
      title: 'Landing target: pad-A',
      meaning: 'Where to land. Pad identity only (no classroom metres in the code)',
    })
  })

  it('surfaces classroom metres when the code carried a pose', () => {
    expect(
      landingTargetPresentation({
        kind: 'pose',
        id: 'pad-A',
        eastM: 2,
        northM: 1,
        raw: 'ttf-land:pad-A;east=2;north=1',
      }),
    ).toEqual({
      title: 'Landing target: pad-A',
      meaning: 'Where to land · east 2 m · north 1 m',
    })
  })
})
