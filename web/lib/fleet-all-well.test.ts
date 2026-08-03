import { describe, expect, it } from 'vitest'
import { fleetAllWell, fleetAllWellSentence } from './fleet-all-well'

describe('fleetAllWell', () => {
  it('answers calmly when nothing needs attention, with the zero still present', () => {
    const result = fleetAllWell([
      { status: 'Ready' },
      { status: 'Flying' },
      { status: 'Offline' },
    ])
    expect(result.attentionCount).toBe(0)
    expect(result.sentence).toBe('Everything is fine — 0 need attention')
  })

  it('names the Needs Attention count when something is wrong', () => {
    expect(
      fleetAllWell([{ status: 'Not Ready' }, { status: 'Ready' }]).sentence,
    ).toBe('1 needs attention')
    expect(
      fleetAllWell([
        { status: 'Not Ready' },
        { status: 'Fault' },
        { status: 'Ready' },
      ]).sentence,
    ).toBe('2 need attention')
  })

  it('treats an empty Fleet as fine, still showing zero', () => {
    expect(fleetAllWell([])).toEqual({
      attentionCount: 0,
      sentence: 'Everything is fine — 0 need attention',
    })
  })
})

describe('fleetAllWellSentence', () => {
  it('keeps the zero in the calm sentence', () => {
    expect(fleetAllWellSentence(0)).toContain('0')
    expect(fleetAllWellSentence(0)).toMatch(/fine/i)
  })
})
