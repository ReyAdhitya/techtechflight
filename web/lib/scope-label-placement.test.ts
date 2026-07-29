import { describe, expect, it } from 'vitest'
import {
  SCOPE_LABEL_ELEVATION_NUDGE_STEP_REM,
  SCOPE_LABEL_NUDGE_STEP_REM,
  SCOPE_LABEL_STACK_STEP_REM,
  scopeLabelPlacements,
  type ScopeLabelMark,
} from './scope-label-placement'

/**
 * Scope label placement (#61 / #86) — names above marks; elevation piles stack.
 */

const mark = (id: string, xPercent: number, yPercent = 50): ScopeLabelMark => ({
  id,
  xPercent,
  yPercent,
})

describe('scopeLabelPlacements on top-down', () => {
  it('puts a lone name centred above its mark', () => {
    expect(scopeLabelPlacements([mark('a', 40)], 'top-down').get('a')).toEqual({
      vertical: 'above',
      nudgeXRem: 0,
      nudgeYRem: 0,
    })
  })

  it('keeps every name above when several Drones sit in a classroom row', () => {
    const row = [0, 12.5, 25, 37.5, 50, 62.5].map((x, i) => mark(`d${i}`, x, 50))
    const placements = scopeLabelPlacements(row, 'top-down')

    for (const m of row) {
      expect(placements.get(m.id)?.vertical).toBe('above')
      expect(placements.get(m.id)?.nudgeYRem).toBe(0)
    }
  })

  it('staggers neighbours that would otherwise share one spot, and never drops a name', () => {
    const packed = [mark('left', 40), mark('right', 45)]
    const placements = scopeLabelPlacements(packed, 'top-down')

    expect(placements.size).toBe(2)
    expect(placements.get('left')).toEqual({
      vertical: 'above',
      nudgeXRem: -SCOPE_LABEL_NUDGE_STEP_REM / 2,
      nudgeYRem: 0,
    })
    expect(placements.get('right')).toEqual({
      vertical: 'above',
      nudgeXRem: SCOPE_LABEL_NUDGE_STEP_REM / 2,
      nudgeYRem: 0,
    })
  })

  it('does not nudge craft that are already well separated', () => {
    const spaced = [mark('west', 20), mark('east', 80)]
    const placements = scopeLabelPlacements(spaced, 'top-down')

    expect(placements.get('west')).toEqual({ vertical: 'above', nudgeXRem: 0, nudgeYRem: 0 })
    expect(placements.get('east')).toEqual({ vertical: 'above', nudgeXRem: 0, nudgeYRem: 0 })
  })
})

describe('scopeLabelPlacements on elevation', () => {
  it('aims the label toward the middle of the box, still without dropping names', () => {
    const high = mark('high', 40, 20)
    const low = mark('low', 60, 80)
    const placements = scopeLabelPlacements([high, low], 'elevation')

    expect(placements.get('high')).toEqual({ vertical: 'below', nudgeXRem: 0, nudgeYRem: 0 })
    expect(placements.get('low')).toEqual({ vertical: 'above', nudgeXRem: 0, nudgeYRem: 0 })
  })

  it('staggers a packed pair that share a height but not the same column', () => {
    const pair = [mark('a', 40, 90), mark('b', 48, 90)]
    const placements = scopeLabelPlacements(pair, 'elevation')

    expect(placements.get('a')?.vertical).toBe('above')
    expect(placements.get('b')?.vertical).toBe('above')
    expect(placements.get('a')?.nudgeXRem).not.toBe(placements.get('b')?.nudgeXRem)
    expect(Math.abs(placements.get('a')!.nudgeXRem - placements.get('b')!.nudgeXRem)).toBe(
      SCOPE_LABEL_ELEVATION_NUDGE_STEP_REM,
    )
  })

  it('stacks coincident Front piles vertically so names do not print on top of each other', () => {
    const pile = [mark('a', 50, 100), mark('b', 50.5, 100), mark('c', 51, 99.5)]
    const placements = scopeLabelPlacements(pile, 'elevation')

    expect(placements.get('a')?.vertical).toBe('above')
    expect(placements.get('b')?.vertical).toBe('above')
    expect(placements.get('c')?.vertical).toBe('above')
    expect(placements.get('a')?.nudgeYRem).toBe(0)
    expect(placements.get('b')?.nudgeYRem).toBe(SCOPE_LABEL_STACK_STEP_REM)
    expect(placements.get('c')?.nudgeYRem).toBe(SCOPE_LABEL_STACK_STEP_REM * 2)
    expect(placements.get('a')?.nudgeXRem).toBe(0)
  })

  it('never flips a grounded pile below the mark into the footer', () => {
    const grounded = [mark('g1', 40, 100), mark('g2', 40, 100)]
    const placements = scopeLabelPlacements(grounded, 'elevation')

    for (const id of ['g1', 'g2']) {
      expect(placements.get(id)?.vertical).toBe('above')
    }
  })
})
