import { describe, expect, it } from 'vitest'
import {
  fleetHeadcount,
  formatHeadcount,
  togglePresent,
} from './fleet-headcount'

const fleet = [
  { id: 'a', name: 'Drone 1' },
  { id: 'b', name: 'Drone 2' },
  { id: 'c', name: 'Drone 3' },
] as const

describe('fleetHeadcount', () => {
  it('renders the count at zero and lists every craft as missing', () => {
    const result = fleetHeadcount(fleet, new Set())
    expect(result.presentCount).toBe(0)
    expect(result.total).toBe(3)
    expect(result.missing).toEqual([...fleet])
    expect(formatHeadcount(result)).toBe('0 of 3 present')
  })

  it('keeps missing craft in board order after some are ticked', () => {
    const result = fleetHeadcount(fleet, new Set(['b']))
    expect(result.presentCount).toBe(1)
    expect(result.missing.map((craft) => craft.id)).toEqual(['a', 'c'])
    expect(formatHeadcount(result)).toBe('1 of 3 present')
  })

  it('lists nobody missing when every craft is present', () => {
    const result = fleetHeadcount(fleet, new Set(['a', 'b', 'c']))
    expect(result.presentCount).toBe(3)
    expect(result.missing).toEqual([])
  })
})

describe('togglePresent', () => {
  it('adds and removes without mutating the prior set', () => {
    const empty = new Set<string>()
    const withA = togglePresent(empty, 'a')
    expect(empty.has('a')).toBe(false)
    expect(withA.has('a')).toBe(true)
    expect(togglePresent(withA, 'a').has('a')).toBe(false)
  })
})
