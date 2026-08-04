import { describe, expect, it } from 'vitest'
import { PLAYBOOK, byUrgency, playbookFor, PRIORITY_WORDS } from './incident-playbook.ts'
import type { AlertKind } from './vitals.ts'

/**
 * The playbook is the mechanism behind "a Teacher never has to ask anyone how this works",
 * so the tests are mostly about coverage and about order.
 *
 * The coverage one is the important one. An Alert with no entry reaches a Teacher as a
 * condition with no advice, which is the precise failure this table exists to prevent —
 * and it would arrive silently, the day someone adds a new kind.
 */

/** Every kind the union allows, by hand, so adding one has to fail here first. */
const EVERY_KIND: readonly AlertKind[] = [
  'emergency-stop',
  'fault',
  'separation',
  'no-response',
  'obstacle',
  'low-endurance',
  'uneven-motors',
  'battery-low',
  'no-fly',
  'crash',
  'missed-checkpoint',
  'mission-timeout',
]

describe('coverage', () => {
  it('has advice for every kind of Alert', () => {
    for (const kind of EVERY_KIND) {
      expect(playbookFor(kind), kind).not.toBeNull()
    }
  })

  it('has no entries for Alerts that do not exist', () => {
    for (const entry of PLAYBOOK) {
      expect(EVERY_KIND).toContain(entry.kind)
    }
  })

  it('gives every entry something the Teacher can actually do', () => {
    for (const entry of PLAYBOOK) {
      expect(entry.responses.length, entry.kind).toBeGreaterThan(0)
      for (const response of entry.responses) {
        expect(response.label, entry.kind).not.toHaveLength(0)
        expect(response.detail, entry.kind).not.toHaveLength(0)
      }
    }
  })

  it('tells the Teacher what the aircraft is already doing, and what done looks like', () => {
    // Without these two a Teacher is guessing at both ends: duplicating work the aircraft
    // has already done, and not knowing when to stop worrying.
    for (const entry of PLAYBOOK) {
      expect(entry.craftDoes, entry.kind).not.toHaveLength(0)
      expect(entry.systemDoes, entry.kind).not.toHaveLength(0)
      expect(entry.resolvedWhen, entry.kind).not.toHaveLength(0)
      expect(entry.teamDoes, entry.kind).not.toHaveLength(0)
    }
  })
})

describe('honesty about what the aircraft does by itself', () => {
  it('never claims an automatic behaviour the hardware does not have', () => {
    /*
     * The aircraft in this product avoids nothing and returns from nothing on its own.
     * A playbook that said "it will avoid the obstacle" would teach a Teacher to wait for
     * something that is not coming.
     */
    expect(playbookFor('obstacle')?.craftDoes).toMatch(/does not avoid|nothing automatic/i)
    expect(playbookFor('no-fly')?.craftDoes).toMatch(/nothing/i)
  })

  it('treats a possible hard landing as unknown rather than as a crash', () => {
    // Nothing on a real link reports one. It is inferred, and has to read as inferred.
    expect(playbookFor('crash')?.title).toMatch(/possible/i)
    expect(playbookFor('crash')?.craftDoes).toMatch(/relied on|unknown/i)
  })

  it('never says a silent Drone has landed', () => {
    expect(playbookFor('no-response')?.craftDoes).toMatch(/unknown/i)
  })
})

describe('which Commands the advice reaches for', () => {
  it('only ever names Commands that exist', () => {
    const allowed = new Set(['land', 'hold', 'return-home', 'emergency-stop', null])
    for (const entry of PLAYBOOK) {
      for (const response of entry.responses) {
        expect(allowed.has(response.command), `${entry.kind}: ${response.label}`).toBe(true)
      }
    }
  })

  it('keeps Stop for the two cases where somebody could be hurt', () => {
    /*
     * Cutting the motors on an airborne aircraft is not the safe fallback it sounds like,
     * and ADR-0011 says so. It must not creep into the advice for a flat battery.
     */
    const offersStop = PLAYBOOK.filter((entry) =>
      entry.responses.some((r) => r.command === 'emergency-stop'),
    ).map((entry) => entry.kind)

    expect(offersStop.sort()).toEqual(['crash'])
  })

  it('leans on Instructions, which work on real hardware', () => {
    // Most of what a Teacher does is said to a person, not sent to an aircraft. If this
    // ever inverts, the product has quietly become unusable on a real Fleet (ADR-0021).
    const responses = PLAYBOOK.flatMap((entry) => entry.responses)
    const nonCommands = responses.filter((r) => r.command === null)
    expect(nonCommands.length).toBeGreaterThan(responses.length / 3)
  })
})

describe('the order a Teacher should work in', () => {
  it('puts people before the airspace, and the airspace before the aircraft', () => {
    const ranked = byUrgency<AlertKind>(
      ['battery-low', 'no-fly', 'separation', 'uneven-motors'],
      (kind) => kind,
    )
    expect(ranked).toEqual(['separation', 'no-fly', 'battery-low', 'uneven-motors'])
  })

  it('does not rank by Alert severity', () => {
    /*
     * `low-endurance` is a warning and `no-fly` will be critical, but that is not why one
     * comes first. Being out of bounds is an airspace failure and a flat battery is an
     * aircraft one, and the customer's priorities put those in that order.
     */
    expect(byUrgency<AlertKind>(['low-endurance', 'no-fly'], (k) => k)).toEqual([
      'no-fly',
      'low-endurance',
    ])
  })

  it('keeps equal priorities in the order they arrived', () => {
    // A list that reshuffles under a Teacher mid-glance is the defect
    // DELIBERATE-POSITIONS 1 exists to prevent, and it applies here too.
    const arrived: readonly AlertKind[] = ['fault', 'obstacle', 'no-response']
    expect(byUrgency<AlertKind>(arrived, (k) => k)).toEqual(arrived)
  })

  it('does not lose an item it has no advice for', () => {
    // Ranked last rather than dropped. Silence about a real condition is worse than
    // showing it without a recommendation.
    const ranked = byUrgency<string>(['no-fly', 'something-new'], (k) => k as AlertKind)
    expect(ranked).toHaveLength(2)
    expect(ranked.at(-1)).toBe('something-new')
  })
})

describe('the priority names', () => {
  it('reads as a sentence rather than an identifier', () => {
    for (const word of Object.values(PRIORITY_WORDS)) {
      expect(word).toMatch(/^[A-Z]/)
    }
  })
})
