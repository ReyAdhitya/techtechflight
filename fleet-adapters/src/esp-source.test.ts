import { describe, expect, it } from 'vitest'
import type { TelemetryObservation } from '@techtechflight/contract'
import { TestClock } from '@techtechflight/contract/testing'
import { EspTelemetrySource } from './esp-source.ts'

/**
 * The door the school's own drones knock on.
 *
 * Every rule here is one a classroom breaks by accident. Half-written firmware sends nonsense,
 * a bench test in the next room sends a name nobody registered, and an aircraft that cannot
 * measure its height sends no height at all. None of those may reach a Teacher as a number.
 */

const REGISTRATIONS = [{ id: 'ttf-0001' }, { id: 'ttf-0002' }] as const

function door() {
  const clock = new TestClock(1_000_000)
  const source = new EspTelemetrySource({ clock, registrations: REGISTRATIONS })
  const seen: TelemetryObservation[] = []
  source.onObservation((observation) => seen.push(observation))
  return { source, seen }
}

const packet = (body: Record<string, unknown>) => JSON.stringify(body)

describe('what the door accepts', () => {
  it('takes a full packet and reports every field', () => {
    const { source, seen } = door()

    source.ingest(
      packet({ id: 'ttf-0001', battery: 0.74, height: 2.1, east: 1.2, north: -0.4, airborne: true }),
    )

    expect(seen).toHaveLength(1)
    expect(seen[0]?.droneId).toBe('ttf-0001')
    expect(seen[0]?.telemetry.batteryFraction).toBeCloseTo(0.74)
    expect(seen[0]?.telemetry.batteryIsEstimate).toBe(false)
    expect(seen[0]?.telemetry.altitudeM).toBeCloseTo(2.1)
    expect(seen[0]?.telemetry.position).toEqual({ eastM: 1.2, northM: -0.4 })
    expect(seen[0]?.telemetry.airborne).toBe(true)
  })

  it('takes a packet carrying nothing but an id', () => {
    const { source, seen } = door()

    source.ingest(packet({ id: 'ttf-0001' }))

    expect(seen).toHaveLength(1)
  })
})

/**
 * **Absent means cannot report, and is never a zero.**
 *
 * A drone that cannot measure its height must not be drawn sitting on the ground, and one that
 * cannot measure charge must not read as flat. The contract distinguishes absent from null and
 * the board says both in words, so the only job here is to fill nothing in.
 */
describe('absent is not zero', () => {
  it('reports no height rather than a height of nothing', () => {
    const { source, seen } = door()

    source.ingest(packet({ id: 'ttf-0001', battery: 0.5 }))

    expect(seen[0]?.telemetry.altitudeM).toBeUndefined()
  })

  it('reports no position rather than the origin', () => {
    const { source, seen } = door()

    source.ingest(packet({ id: 'ttf-0001', height: 1 }))

    expect(seen[0]?.telemetry.position).toBeUndefined()
  })

  /* Half a position is not a position. A Drone drawn on the north line it never claimed is a
     Drone in the wrong place, which on a Scope is worse than one that is missing. */
  it('refuses half a position', () => {
    const { source, seen } = door()

    source.ingest(packet({ id: 'ttf-0001', east: 3 }))

    expect(seen[0]?.telemetry.position).toBeUndefined()
  })

  /* Charge has no absent form in the contract, so it is marked as a reading not to trust. */
  it('marks a missing charge as an estimate rather than a measurement', () => {
    const { source, seen } = door()

    source.ingest(packet({ id: 'ttf-0001' }))

    expect(seen[0]?.telemetry.batteryIsEstimate).toBe(true)
  })

  it('keeps a real charge as a measurement', () => {
    const { source, seen } = door()

    source.ingest(packet({ id: 'ttf-0001', battery: 0.2 }))

    expect(seen[0]?.telemetry.batteryIsEstimate).toBe(false)
  })
})

/**
 * A stray packet must not add an aircraft to a Teacher's board mid-lesson.
 *
 * Registration comes from config, the way the ground station registers a set today. A drone
 * team testing `drone-9` on a bench in the next room is on the same router.
 */
describe('an id the Fleet does not know', () => {
  it('is not invented into a Drone', () => {
    const { source, seen } = door()

    source.ingest(packet({ id: 'drone-9', battery: 0.9, airborne: true }))

    expect(seen).toHaveLength(0)
  })

  it('does not stop the ones that are known', () => {
    const { source, seen } = door()

    source.ingest(packet({ id: 'drone-9' }))
    source.ingest(packet({ id: 'ttf-0002' }))

    expect(seen.map((o) => o.droneId)).toEqual(['ttf-0002'])
  })
})

/**
 * A classroom full of half-written firmware is the normal case, not the edge case.
 *
 * Every one of these used to be a way to take a Teacher's board down in front of a class.
 */
describe('what the door drops quietly', () => {
  const junk = [
    ['not JSON at all', 'hello world'],
    ['an empty string', ''],
    ['a JSON array', '[1,2,3]'],
    ['a bare number', '42'],
    ['null', 'null'],
    ['an object with no id', packet({ battery: 0.5 })],
    ['an id that is not a string', packet({ id: 7 })],
    ['an id that is only spaces', packet({ id: '   ' })],
    ['half a packet', '{"id":"ttf-0001её'],
  ] as const

  for (const [what, body] of junk) {
    it(`drops ${what} without a sound`, () => {
      const { source, seen } = door()

      expect(() => source.ingest(body)).not.toThrow()
      expect(seen).toHaveLength(0)
    })
  }

  it('drops a packet too large to be a reading', () => {
    const { source, seen } = door()

    source.ingest(packet({ id: 'ttf-0001', note: 'x'.repeat(4_000) }))

    expect(seen).toHaveLength(0)
  })

  /* NaN and Infinity survive a JSON round trip through some encoders. Neither is a height. */
  it('ignores a number that is not finite', () => {
    const { source, seen } = door()

    source.ingest('{"id":"ttf-0001","height":1e999}')

    expect(seen[0]?.telemetry.altitudeM).toBeUndefined()
  })

  /* A charge outside 0..1 is a firmware unit mistake, not a Drone at 740 per cent. */
  it('holds a charge inside nought and one', () => {
    const { source, seen } = door()

    source.ingest(packet({ id: 'ttf-0001', battery: 74 }))

    expect(seen[0]?.telemetry.batteryFraction).toBe(1)
  })
})

/** Phase 4 needs somewhere to send a reply, and DHCP decides the address. */
describe('remembering where an aircraft spoke from', () => {
  it('keeps the sender per id', () => {
    const { source } = door()

    source.ingest(packet({ id: 'ttf-0001' }), { address: '10.0.0.31', port: 51_000 })

    expect(source.addressOf('ttf-0001')).toEqual({ address: '10.0.0.31', port: 51_000 })
  })

  it('follows an aircraft that comes back on a different address', () => {
    const { source } = door()

    source.ingest(packet({ id: 'ttf-0001' }), { address: '10.0.0.31', port: 51_000 })
    source.ingest(packet({ id: 'ttf-0001' }), { address: '10.0.0.44', port: 51_000 })

    expect(source.addressOf('ttf-0001')?.address).toBe('10.0.0.44')
  })

  it('says nothing about an aircraft that has never spoken', () => {
    const { source } = door()

    expect(source.addressOf('ttf-0002')).toBeNull()
  })
})
