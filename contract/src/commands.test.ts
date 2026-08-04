import { describe, expect, it } from 'vitest'
import { isCommandable, type CommandKind, type Telemetry, type TelemetrySource } from './index.ts'
import { aTelemetry } from './fixtures.ts'

/**
 * The command surface is the one place in the contract where a mistake reaches a real
 * aircraft, so its shape is pinned rather than trusted to review.
 *
 * These tests are deliberately about the *rule* rather than about the type. TypeScript
 * already stops a misspelled kind; nothing but a test stops someone adding a kind that
 * makes a Drone do more than it was doing, which is the invariant ADR-0011 and ADR-0022
 * both rest on.
 */

/** Every kind the union allows, listed by hand so adding one has to fail here first. */
const EVERY_KIND: readonly CommandKind[] = [
  'land',
  'hold',
  'auto-land',
  'emergency-stop',
  'return-home',
]

describe('the Command union', () => {
  it('ends every Command with the aircraft down or where it already is', () => {
    /*
     * The whole safety argument in one assertion. A Command that takes off, climbs,
     * accelerates or picks a new destination breaks the fail-safe property: it makes the
     * worst outcome of a mistaken press something other than an unnecessary landing.
     *
     * `hold` is the one that stays up, and it stays exactly where it is — it is the
     * absence of movement, not a manoeuvre.
     */
    const ENDS_ON_THE_GROUND: readonly CommandKind[] = [
      'land',
      'auto-land',
      'emergency-stop',
      'return-home',
    ]
    const STAYS_PUT: readonly CommandKind[] = ['hold']

    expect([...ENDS_ON_THE_GROUND, ...STAYS_PUT].sort()).toEqual([...EVERY_KIND].sort())
  })

  it('has no Command that chooses a destination', () => {
    /*
     * `return-home` is the only Command that moves an aircraft horizontally, and its
     * destination is not chosen — it is the place the Drone left. A `goto` or `waypoint`
     * kind would be a real expansion of a Teacher's reach and needs its own decision.
     */
    for (const kind of EVERY_KIND) {
      expect(kind).not.toMatch(/goto|waypoint|fly-to|move|climb|take-?off/)
    }
  })
})

describe('a Telemetry Source that will not take Commands', () => {
  const readOnly: TelemetrySource = {
    connect() {},
    disconnect() {},
    onObservation() {
      return () => {}
    },
  }

  it('is not commandable, and is recognised as such at the seam', () => {
    // The hardware adapter shape. It refuses by not implementing, never by guarding.
    expect(isCommandable(readOnly)).toBe(false)
  })

  it('is commandable only once someone writes the method', () => {
    const commandable = { ...readOnly, command() {} }
    expect(isCommandable(commandable)).toBe(true)
  })
})

describe('link quality', () => {
  it('is absent rather than zero when the link cannot describe itself', () => {
    /*
     * Most radios report the aircraft and not the path to it. Absent has to stay absent:
     * a zero here would read as "the link is failing" on a link that is perfectly fine,
     * which is the exact confusion the absent-versus-null rule exists to prevent.
     */
    const noReading = aTelemetry()
    expect(noReading.linkQuality).toBeUndefined()
    expect('linkQuality' in noReading).toBe(false)
  })

  it('is a proportion, not a raw RSSI', () => {
    const strong: Telemetry = aTelemetry({ linkQuality: 0.82 })
    expect(strong.linkQuality).toBeGreaterThanOrEqual(0)
    expect(strong.linkQuality).toBeLessThanOrEqual(1)
  })
})
