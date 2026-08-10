import { describe, expect, it } from 'vitest'
import type { Zone } from './airspace'
import { zoneVisibility, zonesOutsideWindow, type ZoneWindow } from './zone-visibility'

/**
 * A zone the Teacher drew and the Scope will never show.
 *
 * The drawing surface is twenty metres square; the Scope draws a window chosen from where the
 * Drones are, and it can be eight. A zone drawn at fifteen is real, raises Alerts, and is on
 * no view. A Teacher who cannot see a boundary stops believing there is one.
 */

const WINDOW: ZoneWindow = { westM: 0, eastM: 8, southM: 0, northM: 8 }

const box = (
  id: string,
  eastLow: number,
  eastHigh: number,
  northLow: number,
  northHigh: number,
): Zone => ({
  id,
  kind: 'no-fly',
  name: id,
  points: [
    { eastM: eastLow, northM: northLow },
    { eastM: eastHigh, northM: northLow },
    { eastM: eastHigh, northM: northHigh },
    { eastM: eastLow, northM: northHigh },
  ],
})

describe('whether a zone is anywhere the Scope draws', () => {
  it('is inside when every corner is', () => {
    expect(zoneVisibility(box('near', 1, 4, 1, 4), WINDOW)).toBe('inside')
  })

  it('is partly there when some corners are out', () => {
    expect(zoneVisibility(box('edge', 6, 12, 1, 4), WINDOW)).toBe('partly')
  })

  /*
   * A zone drawn around the whole hall has all four corners outside a window in the middle of
   * it, and is drawn across the entire picture. Corners alone would call that invisible.
   */
  it('is partly there when it swallows the window', () => {
    expect(zoneVisibility(box('hall', -5, 20, -5, 20), WINDOW)).toBe('partly')
  })

  it('is outside when it is somewhere else entirely', () => {
    expect(zoneVisibility(box('far', 15, 19, 15, 19), WINDOW)).toBe('outside')
    expect(zoneVisibility(box('behind', -9, -5, 1, 4), WINDOW)).toBe('outside')
  })

  it('has nothing to draw when it has no points', () => {
    expect(zoneVisibility({ id: 'z', kind: 'no-fly', name: 'z', points: [] }, WINDOW))
      .toBe('outside')
  })

  it('names only the ones a Teacher will never see', () => {
    const zones = [box('near', 1, 4, 1, 4), box('far', 15, 19, 15, 19), box('edge', 6, 12, 1, 4)]

    expect(zonesOutsideWindow(zones, WINDOW).map((zone) => zone.id)).toEqual(['far'])
  })
})
